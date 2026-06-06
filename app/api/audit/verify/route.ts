import { NextResponse } from "next/server";
import { withSecurity } from "@/lib/security/middleware";
import { verifyAuditChain } from "@/lib/security/audit";
export const dynamic = "force-dynamic";

export const GET = withSecurity(
  async (_req, _body, auth) => {
    const userId = auth.userId;
    const result = await verifyAuditChain(userId);
    return NextResponse.json(result);
  },
  { method: "GET", skipBody: true }
);
