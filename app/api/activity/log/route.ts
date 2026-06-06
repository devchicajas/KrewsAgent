import { NextResponse } from "next/server";
import { withSecurity } from "@/lib/security/middleware";
import { createServiceClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";

export const GET = withSecurity(
  async (_req, _body, auth) => {
    const userId = auth.userId;
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("action_log")
      .select("id, agent_type, action, status, created_at, reasoning, tars_model")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ rows: data ?? [] });
  },
  { method: "GET", skipBody: true }
);
