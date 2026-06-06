import { z } from "zod";
import type { AgentRunOutput, AgentType } from "@/lib/types/agent";

export const ALLOWED_ACTIONS = {
  draft_email: { maxRisk: "high" as const, sideEffect: "create_gmail_draft" },
  propose_meeting: { maxRisk: "medium" as const, sideEffect: "create_calendar_draft" },
  draft_linkedin_post: { maxRisk: "medium" as const, sideEffect: "save_draft" },
  draft_outreach: { maxRisk: "medium" as const, sideEffect: "save_draft" },
  draft_support_reply: {
    maxRisk: "high" as const,
    sideEffect: "post_github_comment",
  },
  finance_summary: { maxRisk: "low" as const, sideEffect: "none_readonly" },
  security_advisory: { maxRisk: "low" as const, sideEffect: "none_readonly" },
} as const;

export type AllowedActionType = keyof typeof ALLOWED_ACTIONS;

const riskLevelSchema = z.enum(["low", "medium", "high"]);
const agentTypeSchema = z.enum(["ops", "growth", "support", "finance"]);

export const approvalCardSchema = z.object({
  agent_type: agentTypeSchema,
  action_title: z.string().min(1),
  action_type: z.string().min(1),
  risk_level: riskLevelSchema,
  reasoning: z.string().min(1),
  preview: z.string().min(1),
  consequence_approve: z.string().min(1),
  consequence_reject: z.string().min(1),
  payload: z.record(z.unknown()).default({}),
});

export const agentRunOutputSchema = z.object({
  run_summary: z.string(),
  stats: z.object({
    items_reviewed: z.number().int().nonnegative(),
    actions_proposed: z.number().int().nonnegative(),
    approvals_created: z.number().int().nonnegative(),
    actions_executed: z.literal(0),
  }),
  approval_cards: z.array(approvalCardSchema),
  deferred_items: z.array(z.string()),
  security_notes: z.array(z.string()),
  tars_model: z.string(),
});

const ACTION_TITLE_LABELS: Record<string, string> = {
  draft_email: "Draft email",
  propose_meeting: "Propose meeting",
  draft_linkedin_post: "Draft LinkedIn post",
  draft_outreach: "Draft outreach",
  draft_support_reply: "Draft support reply",
  finance_summary: "Finance summary",
  security_advisory: "Security advisory",
};

function deriveActionTitle(
  actionType: string,
  target: string | undefined,
  preview: string | undefined
): string {
  const label = ACTION_TITLE_LABELS[actionType] ?? actionType.replace(/_/g, " ");
  if (target) return `${label} — ${target}`;
  const firstLine = preview?.split("\n").find((line) => line.trim())?.trim();
  if (firstLine && firstLine.length <= 80) return `${label}: ${firstLine}`;
  return label;
}

function buildCardPayload(card: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (typeof card.target === "string" && card.target) payload.to = card.target;
  if (typeof card.subject === "string" && card.subject) payload.subject = card.subject;
  if (typeof card.item_id === "string" && card.item_id) payload.item_id = card.item_id;
  return payload;
}

function normalizeApprovalCard(
  card: unknown,
  agentType: AgentType,
  index: number
): Record<string, unknown> {
  if (!card || typeof card !== "object") {
    return {
      agent_type: agentType,
      action_title: `Proposed action ${index + 1}`,
      action_type: "draft_email",
      risk_level: "medium",
      reasoning: "Proposed action for founder review.",
      preview: "—",
      consequence_approve: "Action will be queued for your approval.",
      consequence_reject: "No action will be taken.",
      payload: {},
    };
  }

  const c = card as Record<string, unknown>;
  const actionType = String(c.action_type ?? "draft_email");
  const target = typeof c.target === "string" ? c.target : undefined;
  const preview = typeof c.preview === "string" ? c.preview : "—";

  return {
    agent_type: c.agent_type ?? agentType,
    action_title:
      typeof c.action_title === "string" && c.action_title
        ? c.action_title
        : deriveActionTitle(actionType, target, preview),
    action_type: actionType,
    risk_level: c.risk_level ?? "medium",
    reasoning:
      typeof c.reasoning === "string" && c.reasoning
        ? c.reasoning
        : "Proposed action for founder review.",
    preview,
    consequence_approve:
      typeof c.consequence_approve === "string" && c.consequence_approve
        ? c.consequence_approve
        : "Action will be queued for your approval.",
    consequence_reject:
      typeof c.consequence_reject === "string" && c.consequence_reject
        ? c.consequence_reject
        : "No action will be taken.",
    payload:
      c.payload && typeof c.payload === "object" && !Array.isArray(c.payload)
        ? (c.payload as Record<string, unknown>)
        : buildCardPayload(c),
  };
}

/** Map alternate TARS shapes (actions/ignored) into AgentRunOutput before Zod. */
export function normalizeAgentRunOutput(raw: unknown, agentType: AgentType): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const obj = raw as Record<string, unknown>;

  const rawCards = Array.isArray(obj.approval_cards)
    ? obj.approval_cards
    : Array.isArray(obj.actions)
      ? obj.actions
      : [];

  const approval_cards = rawCards.map((card, index) =>
    normalizeApprovalCard(card, agentType, index)
  );

  const deferred_items = Array.isArray(obj.deferred_items)
    ? obj.deferred_items.map(String)
    : Array.isArray(obj.ignored)
      ? obj.ignored.map((item) =>
          typeof item === "string"
            ? item
            : typeof item === "object" && item && "reason" in item
              ? String((item as { reason?: string }).reason ?? JSON.stringify(item))
              : String(item)
        )
      : [];

  const statsRaw =
    obj.stats && typeof obj.stats === "object"
      ? (obj.stats as Record<string, unknown>)
      : {};
  const actionsProposed =
    typeof statsRaw.actions_proposed === "number"
      ? statsRaw.actions_proposed
      : approval_cards.length;

  const stats = {
    items_reviewed:
      typeof statsRaw.items_reviewed === "number"
        ? statsRaw.items_reviewed
        : Math.max(actionsProposed, deferred_items.length + approval_cards.length, 1),
    actions_proposed: actionsProposed,
    approvals_created:
      typeof statsRaw.approvals_created === "number"
        ? statsRaw.approvals_created
        : approval_cards.length,
    actions_executed: 0 as const,
  };

  const crewLabel = agentType.charAt(0).toUpperCase() + agentType.slice(1);

  return {
    run_summary:
      typeof obj.run_summary === "string" && obj.run_summary
        ? obj.run_summary
        : `${crewLabel} crew reviewed workspace items. ${approval_cards.length} action${
            approval_cards.length === 1 ? "" : "s"
          } need your approval.`,
    stats,
    approval_cards,
    deferred_items,
    security_notes: Array.isArray(obj.security_notes)
      ? obj.security_notes.map(String)
      : [],
    tars_model: typeof obj.tars_model === "string" ? obj.tars_model : "pending",
  };
}

export function parseAgentRunOutput(
  raw: unknown,
  agentType?: AgentType
): AgentRunOutput | null {
  const normalized = agentType ? normalizeAgentRunOutput(raw, agentType) : raw;
  const result = agentRunOutputSchema.safeParse(normalized);
  return result.success ? result.data : null;
}

export function filterAllowedCards(
  cards: AgentRunOutput["approval_cards"]
): { allowed: AgentRunOutput["approval_cards"]; dropped: AgentRunOutput["approval_cards"] } {
  const allowed: AgentRunOutput["approval_cards"] = [];
  const dropped: AgentRunOutput["approval_cards"] = [];
  for (const card of cards) {
    if (card.action_type in ALLOWED_ACTIONS) {
      allowed.push(card);
    } else {
      dropped.push(card);
    }
  }
  return { allowed, dropped };
}
