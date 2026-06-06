import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withSecurity } from "@/lib/security/middleware";
import { rejectApproval } from "@/lib/security/approvalGuard";

export const dynamic = "force-dynamic";

const schema = z.object({
  approval_id: z.string().uuid(),
});

export const POST = withSecurity(
  async (_req: NextRequest, body: unknown, auth) => {
    const { approval_id } = body as z.infer<typeof schema>;
    const userId = auth.userId;
    const decision = await rejectApproval(approval_id, userId);
    return NextResponse.json(decision, {
      status: decision.allowed ? 200 : 409,
    });
  },
  { schema, rateLimitRoute: "/api/approvals/reject" }
);
