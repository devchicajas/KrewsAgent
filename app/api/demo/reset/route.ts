import { NextResponse } from "next/server";
import { withSecurity } from "@/lib/security/middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { seedDemoUser } from "@/lib/demo/seedCore";
import { getDemoUserId } from "@/lib/env";

export const dynamic = "force-dynamic";

export const POST = withSecurity(
  async (_req, _body, auth) => {
    if (!auth.isDemo) {
      return NextResponse.json(
        { error: "Reset demo is only available in demo mode" },
        { status: 403 }
      );
    }
    const userId = getDemoUserId();
    const supabase = createServiceClient();

    await supabase.from("approvals").delete().eq("user_id", userId);
    await supabase.from("action_log").delete().eq("user_id", userId);
    await supabase.from("rate_limits").delete().eq("user_id", userId);

    await seedDemoUser(userId);

    return NextResponse.json({ ok: true, message: "Demo reset complete" });
  },
  { schema: undefined }
);
