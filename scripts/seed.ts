/**
 * Idempotent demo seed — upserts demo user, founder_context, integrations.
 * Run: npm run seed  |  npm run reseed (clears approvals + action_log first)
 */

import { loadEnvLocal } from "./loadEnv";
import { createServiceClient } from "../lib/supabase/server";
import { seedDemoUser, STABLE_DEMO_ID } from "../lib/demo/seedCore";

loadEnvLocal();

async function main() {
  const reset = process.argv.includes("--reset");
  const userId = process.env.DEMO_USER_ID || STABLE_DEMO_ID;

  const supabase = createServiceClient();

  if (reset) {
    console.log(">> Clearing approvals and action_log...");
    await supabase.from("approvals").delete().eq("user_id", userId);
    await supabase.from("action_log").delete().eq("user_id", userId);
    await supabase.from("rate_limits").delete().eq("user_id", userId);
  }

  console.log(">> Seeding demo user + context...");
  await seedDemoUser(userId);

  console.log("\n✓ Seed complete.");
  console.log(`\n  DEMO_USER_ID=${userId}`);
  console.log("  Paste the line above into .env.local if not already set.\n");
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
