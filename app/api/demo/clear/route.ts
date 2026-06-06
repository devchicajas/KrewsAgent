import { NextResponse } from "next/server";
import { withSecurity } from "@/lib/security/middleware";
import { createServiceClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";

export const POST = withSecurity(
  async (_req, _body, auth) => {
    const userId = auth.userId;
    const supabase = createServiceClient();

    await supabase.from("approvals").delete().eq("user_id", userId);
    await supabase.from("action_log").delete().eq("user_id", userId);
    await supabase.from("rate_limits").delete().eq("user_id", userId);

    return NextResponse.json({ ok: true, message: "Data cleared" });
  },
  { schema: undefined }
);
