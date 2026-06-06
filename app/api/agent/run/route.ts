import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withSecurity } from "@/lib/security/middleware";
import { runPipeline } from "@/lib/pipeline/runPipeline";
import { isDemoMode } from "@/lib/env";
import { getFallbackRun } from "@/lib/demo/fallbackRuns";
import { DEFAULT_GROWTH_SHIPPED } from "@/lib/demo/growthDefaults";
import { createApprovalsFromOutput } from "@/lib/pipeline/createApprovals";
import type { AgentType } from "@/lib/types/agent";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const runSchema = z.object({
  agent_type: z.enum(["ops", "growth", "support", "finance"]),
  growth_input: z.string().max(500).optional(),
});

export const POST = withSecurity(
  async (_req: NextRequest, body: unknown, auth) => {
    const { agent_type, growth_input } = body as z.infer<typeof runSchema>;
    const userId = auth.userId;

    const growthInput =
      agent_type === "growth"
        ? (growth_input?.trim() || DEFAULT_GROWTH_SHIPPED)
        : growth_input;

    const supabase = (await import("@/lib/supabase/server")).createServiceClient();

    // Fresh run per crew — matches wireframe (replaces cards, not stacks them)
    await supabase
      .from("approvals")
      .delete()
      .eq("user_id", userId)
      .eq("agent_type", agent_type)
      .eq("status", "pending");

    let result;
    try {
      result = await runPipeline({
        userId,
        agentType: agent_type,
        growthInput,
      });
    } catch (err) {
      if (!isDemoMode()) throw err;
      const output = getFallbackRun(agent_type as AgentType);
      const approvalIds = await createApprovalsFromOutput(
        userId,
        agent_type,
        output,
        [],
        true
      );
      result = {
        output,
        usedFallback: true,
        fallbackReason: "tars_slow" as const,
        approvalIds,
      };
    }

    const { data: approvals } = await supabase
      .from("approvals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    const { count: pending } = await supabase
      .from("approvals")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pending");

    const { count: resolved } = await supabase
      .from("approvals")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["approved", "rejected", "executed"]);

    return NextResponse.json({
      ...result.output,
      used_fallback: result.usedFallback,
      fallback_reason: result.fallbackReason ?? null,
      ops_inbox_source: result.opsInboxSource,
      approvals: approvals ?? [],
      stats: {
        ...result.output.stats,
        pending: pending ?? 0,
        resolved: resolved ?? 0,
      },
    });
  },
  { schema: runSchema, rateLimitRoute: "/api/agent/run" }
);
