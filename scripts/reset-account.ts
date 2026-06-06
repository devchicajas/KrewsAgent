/**
 * Delete a real user account and all related data (fresh sign-up + GitHub connect).
 * Run: npm run account:reset -- chicajasdev@gmail.com
 */

import { loadEnvLocal } from "./loadEnv";
import { createServiceClient } from "../lib/supabase/server";
import { DEMO_EMAIL } from "../lib/demo/seedCore";

loadEnvLocal();

async function main() {
  const email = process.argv[2]?.toLowerCase().trim();
  if (!email) {
    console.error("\nUsage: npm run account:reset -- your@email.com\n");
    process.exit(1);
  }

  if (email === DEMO_EMAIL) {
    console.error("\nRefusing to delete the shared demo sandbox account.\n");
    process.exit(1);
  }

  const supabase = createServiceClient();

  const { data: user, error: findErr } = await supabase
    .from("users")
    .select("id, email, name")
    .eq("email", email)
    .maybeSingle();

  if (findErr) {
    console.error("Lookup failed:", findErr.message);
    process.exit(1);
  }

  if (!user) {
    console.log(`\nNo account found for ${email} — already clean.\n`);
    return;
  }

  const userId = user.id;
  console.log(`\n>> Resetting account: ${user.email} (${userId})\n`);

  const tables = [
    "password_reset_tokens",
    "rate_limits",
    "action_log",
    "approvals",
    "integrations",
    "founder_context",
  ] as const;

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error) {
      console.error(`  ✗ ${table}: ${error.message}`);
      process.exit(1);
    }
    console.log(`  ✓ cleared ${table}`);
  }

  const { error: userErr } = await supabase.from("users").delete().eq("id", userId);
  if (userErr) {
    console.error(`  ✗ users: ${userErr.message}`);
    process.exit(1);
  }
  console.log("  ✓ deleted users row");

  console.log(`
>> Done. Next steps:
   1. IMPORTANT: clear browser cookies for localhost:3000
      (DevTools → Application → Cookies → delete krews_session)
   2. Sign up again with ${email} (or sign in if you already re-created it)
   3. Go to Connect → CONNECT GITHUB → pick repo → SAVE REPO CHOICE
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
