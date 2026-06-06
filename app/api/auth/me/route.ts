import { NextResponse } from "next/server";
import { withSecurity } from "@/lib/security/middleware";

export const dynamic = "force-dynamic";

export const GET = withSecurity(
  async (_req, _body, auth) => {
    return NextResponse.json({
      user_id: auth.userId,
      is_demo: auth.isDemo,
      account_type: auth.isDemo ? "demo_sandbox" : "user",
      email: auth.isDemo ? null : (auth.email ?? null),
      display_name: auth.isDemo
        ? "Demo Sandbox"
        : (auth.name ?? auth.email?.split("@")[0] ?? null),
    });
  },
  { method: "GET", skipBody: true }
);
