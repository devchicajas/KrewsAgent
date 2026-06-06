import { createServiceClient } from "@/lib/supabase/server";
import { STABLE_DEMO_ID } from "@/lib/demo/seedCore";
import type { AppUser } from "./users";

const DEMO_SANDBOX_EMAIL = "demo-sandbox@krewsagent.local";

/** Create app rows for a new account (idempotent). */
export async function ensureUserProvisioned(user: AppUser): Promise<void> {
  const supabase = createServiceClient();
  const name = user.name || user.email.split("@")[0] || "Founder";
  const email = user.email;
  const demoUserId = process.env.DEMO_USER_ID || STABLE_DEMO_ID;

  const { data: emailConflict } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .neq("id", user.id)
    .maybeSingle();

  if (emailConflict) {
    if (emailConflict.id === demoUserId) {
      await supabase
        .from("users")
        .update({ email: DEMO_SANDBOX_EMAIL, name: "Demo Sandbox" })
        .eq("id", demoUserId);
    } else {
      throw new Error("Email already registered to another account");
    }
  }

  const { error: userError } = await supabase.from("users").upsert(
    {
      id: user.id,
      email,
      name,
    },
    { onConflict: "id" }
  );
  if (userError) throw new Error(`users upsert failed: ${userError.message}`);

  const { data: ctx } = await supabase
    .from("founder_context")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!ctx) {
    const { error: ctxError } = await supabase.from("founder_context").insert({
      user_id: user.id,
      founder_name: name,
      company: "My startup",
      stage: "Pre-seed, solo",
      persona: "Founder building with KrewsAgent",
      mrr: 0,
      mrr_change: 0,
      runway_months: 12,
      burn_rate: 0,
    });
    if (ctxError) {
      throw new Error(`founder_context insert failed: ${ctxError.message}`);
    }
  } else if (name && name !== "Founder") {
    await supabase
      .from("founder_context")
      .update({ founder_name: name })
      .eq("user_id", user.id);
    await supabase.from("users").update({ name }).eq("id", user.id);
  }

  for (const provider of ["gmail", "github", "slack"]) {
    const { data: existing } = await supabase
      .from("integrations")
      .select("id")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .maybeSingle();

    if (!existing) {
      await supabase.from("integrations").insert({
        user_id: user.id,
        provider,
        connected: false,
        payload: {},
      });
    }
  }
}
