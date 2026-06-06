import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withSecurity } from "@/lib/security/middleware";
import { executeApproval } from "@/lib/security/approvalGuard";

export const dynamic = "force-dynamic";

const schema = z.object({
  approval_id: z.string().uuid(),
  acknowledge_high_risk: z.boolean().optional(),
  delivery_mode: z.enum(["draft", "send", "acknowledge"]).optional(),
});

export const POST = withSecurity(
  async (_req: NextRequest, body: unknown, auth) => {
    const { approval_id, acknowledge_high_risk, delivery_mode } = body as z.infer<
      typeof schema
    >;
    const userId = auth.userId;
    const decision = await executeApproval(approval_id, userId, {
      highRisk: acknowledge_high_risk,
      deliveryMode: delivery_mode,
    });
    return NextResponse.json(decision, {
      status: decision.allowed ? 200 : 409,
    });
  },
  { schema, rateLimitRoute: "/api/approvals/approve" }
);
