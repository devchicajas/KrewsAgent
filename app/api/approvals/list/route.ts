import { NextResponse } from "next/server";
import { withSecurity } from "@/lib/security/middleware";
import { createServiceClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";

export const GET = withSecurity(
  async (_req, _body, auth) => {
    const userId = auth.userId;
    const supabase = createServiceClient();

    const { data: approvals, error } = await supabase
      .from("approvals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = approvals ?? [];
    const pending = rows.filter((a) => a.status === "pending").length;
    const resolved = rows.filter((a) =>
      ["approved", "rejected", "executed"].includes(a.status)
    ).length;

    return NextResponse.json({
      approvals: rows,
      stats: { pending, resolved },
    });
  },
  { method: "GET", skipBody: true }
);
