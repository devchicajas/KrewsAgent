import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { seedDemoUser, STABLE_DEMO_ID } from "@/lib/demo/seedCore";

export const dynamic = "force-dynamic";

/** Self-seed safety net — idempotent, works on Vercel (public) */
export async function GET() {
  const userId = process.env.DEMO_USER_ID || STABLE_DEMO_ID;
  const supabase = createServiceClient();

  const { data: ctx } = await supabase
    .from("founder_context")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (ctx) {
    return NextResponse.json({ seeded: true, user_id: userId });
  }

  try {
    await seedDemoUser(userId);
    return NextResponse.json({ seeded: true, user_id: userId, auto_seeded: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "seed failed";
    return NextResponse.json({ seeded: false, error: message }, { status: 500 });
  }
}
