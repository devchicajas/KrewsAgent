/**
 * Applies db/schema.sql then runs seed.
 * Requires DATABASE_URL or SUPABASE_DB_PASSWORD in .env.local for schema apply.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import pg from "pg";
import { loadEnvLocal } from "./loadEnv";

loadEnvLocal();

function getProjectRef(): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  return supabaseUrl.replace("https://", "").replace(".supabase.co", "");
}

function getDatabaseUrls(): string[] {
  const urls: string[] = [];
  if (process.env.DATABASE_URL) urls.push(process.env.DATABASE_URL);

  const password = process.env.SUPABASE_DB_PASSWORD;
  const ref = getProjectRef();
  if (password && ref) {
    const enc = encodeURIComponent(password);
    // Pooler (session + transaction) — direct db.* host often fails DNS on some networks
    urls.push(
      `postgresql://postgres.${ref}:${enc}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
      `postgresql://postgres.${ref}:${enc}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
    );
  }
  return Array.from(new Set(urls));
}

async function applySchema() {
  const urls = getDatabaseUrls();
  if (!urls.length) {
    console.log("\n⚠ DATABASE_URL or SUPABASE_DB_PASSWORD not set.");
    console.log("  Paste db/schema.sql into Supabase SQL Editor and run it once,");
    console.log("  then re-run: npm run seed\n");
    return false;
  }

  const schemaPath = resolve(process.cwd(), "db/schema.sql");
  const sql = readFileSync(schemaPath, "utf-8");

  for (const databaseUrl of urls) {
    const client = new pg.Client({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });
    try {
      await client.connect();
      console.log(">> Applying schema...");
      await client.query(sql);
      console.log("✓ Schema applied.");
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already exists") || msg.includes("duplicate")) {
        console.log("✓ Schema already applied (idempotent).");
        return true;
      }
      console.error("Schema apply failed:", msg);
    } finally {
      await client.end().catch(() => {});
    }
  }

  console.log("\n  Fallback: paste db/schema.sql into Supabase SQL Editor manually.\n");
  return false;
}

async function main() {
  await applySchema();
  const { spawnSync } = await import("child_process");
  const result = spawnSync("npx", ["tsx", "scripts/seed.ts"], {
    stdio: "inherit",
    cwd: process.cwd(),
    env: process.env,
  });
  process.exit(result.status ?? 1);
}

main();
