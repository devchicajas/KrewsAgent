/**
 * KrewsAgent Secure Ops Pipeline
 * 7 stages: Context → Classify → Plan → Risk → Draft → Approval Guard → Audit
 */
import { readFileSync } from "fs";
import { join } from "path";
import type { AgentType, AgentRunOutput } from "@/lib/types/agent";
import { createServiceClient } from "@/lib/supabase/server";
import { ALL_SEED_EMAILS } from "@/lib/demo/seedEmails";
import { getFallbackRun } from "@/lib/demo/fallbackRuns";
import { fenceExternalContent } from "@/lib/security/untrustedInput";
import { parseAgentRunOutput } from "@/lib/security/outputValidation";
import { safeWriteAuditEntry } from "@/lib/security/audit";
import { tarsChat, MODELS, extractJson } from "@/lib/tarsClient";
import { isDemoMode } from "@/lib/env";
import { createApprovalsFromOutput } from "./createApprovals";
import { fetchOpenIssues } from "@/lib/github/fetchIssues";
import {
  fetchInboxMessages,
  formatInboxMessageContent,
  isGmailConnected,
} from "@/lib/gmail/fetchInbox";

function loadPrompt(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf-8");
}

export interface RunPipelineInput {
  userId: string;
  agentType: AgentType;
  growthInput?: string;
}

export type FallbackReason = "tars_slow" | "no_actionable" | null;

export interface RunPipelineResult {
  output: AgentRunOutput;
  usedFallback: boolean;
  fallbackReason: FallbackReason;
  approvalIds: string[];
  opsInboxSource?: OpsInboxSource;
}

export type OpsInboxSource =
  | "gmail_live"
  | "gmail_empty"
  | "gmail_error"
  | "demo_seed"
  | "not_ops";

async function collectContext(
  userId: string,
  agentType: AgentType,
  growthInput?: string
): Promise<{
  founder: Record<string, unknown> | null;
  items: { id: string; content: string }[];
  growthInput?: string;
  opsInboxSource: OpsInboxSource;
}> {
  const supabase = createServiceClient();
  const { data: founder } = await supabase
    .from("founder_context")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (agentType === "ops") {
    const gmailLive = await isGmailConnected(userId);
    if (gmailLive) {
      const { messages, live } = await fetchInboxMessages(userId, 15);
      if (live && messages.length > 0) {
        return {
          founder,
          items: messages.map((e) => ({
            id: e.id,
            content: formatInboxMessageContent(e),
          })),
          growthInput: undefined,
          opsInboxSource: "gmail_live",
        };
      }
      if (live && messages.length === 0) {
        const items = ALL_SEED_EMAILS.map((e) => ({
          id: e.id,
          content: `From: ${e.from}\nSubject: ${e.subject}\n\n${e.body}`,
        }));
        return {
          founder,
          items,
          growthInput: undefined,
          opsInboxSource: "gmail_empty",
        };
      }
      if (!live) {
        const items = ALL_SEED_EMAILS.map((e) => ({
          id: e.id,
          content: `From: ${e.from}\nSubject: ${e.subject}\n\n${e.body}`,
        }));
        return {
          founder,
          items,
          growthInput: undefined,
          opsInboxSource: "gmail_error",
        };
      }
    }
    const items = ALL_SEED_EMAILS.map((e) => ({
      id: e.id,
      content: `From: ${e.from}\nSubject: ${e.subject}\n\n${e.body}`,
    }));
    return { founder, items, growthInput: undefined, opsInboxSource: "demo_seed" };
  }

  if (agentType === "growth") {
    return {
      founder,
      items: [{ id: "growth-input", content: growthInput ?? "" }],
      growthInput,
      opsInboxSource: "not_ops",
    };
  }

  if (agentType === "finance") {
    return {
      founder,
      items: [],
      growthInput: undefined,
      opsInboxSource: "not_ops",
    };
  }

  // support — live GitHub issues (per-user OAuth when connected)
  const { issues } = await fetchOpenIssues(userId);
  return {
    founder,
    items: issues.map((i) => ({
      id: i.id,
      content: `Issue #${i.number} (${i.user}): ${i.title}\n\n${i.body}`,
    })),
    growthInput: undefined,
    opsInboxSource: "not_ops",
  };
}

async function callTars(
  agentType: AgentType,
  founder: Record<string, unknown> | null,
  fenced: string,
  playbook: string
): Promise<AgentRunOutput | null> {
  const classifySystem = loadPrompt("prompts/system/classify.system.txt");
  const draftSystem = loadPrompt("prompts/system/draft.system.txt");
  const repairPrompt = loadPrompt("prompts/system/json-repair.txt");

  const founderContext = JSON.stringify(founder ?? {}, null, 2);
  const trustedUser = `FOUNDER CONTEXT (TRUSTED):\n${founderContext}\n\nPLAYBOOK (TRUSTED):\n${playbook}\n\nWORKSPACE ITEMS:\n${fenced}`;

  // Skip classify in DEMO_MODE — saves time; draft (or fallback) carries the run
  if (!isDemoMode() && (agentType === "ops" || agentType === "support")) {
    await tarsChat(MODELS.classify, classifySystem, trustedUser).catch(() => null);
  }

  const draftUser =
    agentType === "finance"
      ? `${trustedUser}\n\nProduce a single finance_summary read-only card. stats.actions_executed must be 0.`
      : `${trustedUser}\n\nCrew: ${agentType}. stats.actions_executed must always be 0.`;

  const model = agentType === "finance" ? MODELS.finance : MODELS.draft;

  try {
    const { content, model: usedModel } = await tarsChat(model, draftSystem, draftUser);
    let parsed = parseAgentRunOutput(extractJson(content || "{}"), agentType);
    if (!parsed) {
      const { content: repaired } = await tarsChat(model, repairPrompt, content);
      parsed = parseAgentRunOutput(extractJson(repaired || "{}"), agentType);
    }
    if (parsed) {
      parsed.tars_model = usedModel;
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export async function runPipeline(input: RunPipelineInput): Promise<RunPipelineResult> {
  const { userId, agentType, growthInput } = input;

  await safeWriteAuditEntry({
    user_id: userId,
    agent_type: agentType,
    action: "run_started",
    status: "pending",
  });

  try {
    const { founder, items, opsInboxSource } = await collectContext(
      userId,
      agentType,
      growthInput
    );
    const { fenced, items: processedItems } = fenceExternalContent(items);
    const playbook = loadPrompt(`prompts/playbooks/${agentType}-playbook.md`);

    let output: AgentRunOutput | null = null;
    let usedFallback = false;
    let fallbackReason: FallbackReason = null;
    const reviewedCount = items.length;

    try {
      if (isDemoMode()) {
        // Try live TARS; fallback keeps the demo alive when slow or unreachable
        output = await Promise.race([
          callTars(agentType, founder, fenced, playbook),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 45_000)),
        ]);
      } else {
        output = await callTars(agentType, founder, fenced, playbook);
      }
    } catch {
      output = null;
    }

    if (!output && isDemoMode()) {
      output = getFallbackRun(agentType);
      usedFallback = true;
      fallbackReason = "tars_slow";
      if (agentType === "ops" && reviewedCount > 0) {
        output.stats.items_reviewed = reviewedCount;
      }
    }

    if (
      output &&
      agentType === "ops" &&
      output.approval_cards.length === 0 &&
      isDemoMode()
    ) {
      output = getFallbackRun("ops");
      usedFallback = true;
      fallbackReason = "no_actionable";
      output.stats.items_reviewed = reviewedCount || output.stats.items_reviewed;
      output.run_summary =
        opsInboxSource === "gmail_live"
          ? "Live Gmail (inbox + spam + tabs) had no investor/reply-worthy flags — sample Ops drafts shown for demo."
          : output.run_summary;
    }

    if (!output) {
      await safeWriteAuditEntry({
        user_id: userId,
        agent_type: agentType,
        action: "tars_failure",
        reasoning: "TARS unreachable and DEMO_MODE off",
        status: "failed",
      });
      return {
        output: {
          run_summary: "Could not reach TARS. No actions proposed.",
          stats: {
            items_reviewed: 0,
            actions_proposed: 0,
            approvals_created: 0,
            actions_executed: 0,
          },
          approval_cards: [],
          deferred_items: [],
          security_notes: ["TARS unreachable"],
          tars_model: "none",
        },
        usedFallback: false,
        fallbackReason: null,
        approvalIds: [],
        opsInboxSource: agentType === "ops" ? opsInboxSource : undefined,
      };
    }

    const approvalIds = await createApprovalsFromOutput(
      userId,
      agentType,
      output,
      processedItems,
      usedFallback
    );

    return {
      output,
      usedFallback,
      fallbackReason,
      approvalIds,
      opsInboxSource: agentType === "ops" ? opsInboxSource : undefined,
    };
  } catch (err) {
    // Last resort: DEMO_MODE must never return a dead run
    if (isDemoMode()) {
      const output = getFallbackRun(agentType);
      const approvalIds = await createApprovalsFromOutput(
        userId,
        agentType,
        output,
        [],
        true
      );
      return {
        output,
        usedFallback: true,
        fallbackReason: "tars_slow",
        approvalIds,
        opsInboxSource: agentType === "ops" ? "demo_seed" : undefined,
      };
    }
    throw err;
  }
}
