import { createServiceClient } from "@/lib/supabase/server";

export const STABLE_DEMO_ID = "c0ffee00-0000-4000-8000-000000000001";
/** Not a real inbox — placeholder identity only, never a founder's login */
export const DEMO_EMAIL = "demo-sandbox@krewsagent.local";
export const DEMO_NAME = "Demo Sandbox";
export const DEMO_FOUNDER_NAME = "Jordan";

/** Idempotent demo seed — safe on Vercel (no subprocess). */
export async function seedDemoUser(userId: string): Promise<void> {
  const supabase = createServiceClient();

  const { error: userError } = await supabase.from("users").upsert(
    { id: userId, email: DEMO_EMAIL, name: DEMO_NAME },
    { onConflict: "id" }
  );
  if (userError) throw new Error(`users upsert failed: ${userError.message}`);

  const { error: ctxError } = await supabase.from("founder_context").upsert(
    {
      user_id: userId,
      founder_name: DEMO_FOUNDER_NAME,
      company: "KrewsAgent",
      stage: "Pre-seed, solo",
      persona: "AI Engineering Fellow, building nights and weekends",
      mrr: 1240,
      mrr_change: 340,
      runway_months: 8,
      burn_rate: 4200,
    },
    { onConflict: "user_id" }
  );
  if (ctxError) throw new Error(`founder_context upsert failed: ${ctxError.message}`);

  for (const provider of ["gmail", "github", "slack"]) {
    const { data: existing } = await supabase
      .from("integrations")
      .select("provider, connected, payload")
      .eq("user_id", userId)
      .eq("provider", provider)
      .maybeSingle();

    if (existing) continue;

    const { error } = await supabase.from("integrations").insert({
      user_id: userId,
      provider,
      connected: false,
      payload: {},
    });
    if (error) throw new Error(`integrations insert failed (${provider}): ${error.message}`);
  }
}
