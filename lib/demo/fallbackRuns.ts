/**
 * DEMO_MODE fallback runs — resilience, NOT a security bypass.
 * Still flows through allowlist, risk floor, approval guard, and audit.
 */
import type { AgentRunOutput } from "@/lib/types/agent";
import type { AgentType } from "@/lib/types/agent";

const OPS_FALLBACK: AgentRunOutput = {
  run_summary: "Ops crew reviewed 15 inbox items. 2 actions need your approval.",
  stats: {
    items_reviewed: 15,
    actions_proposed: 2,
    approvals_created: 2,
    actions_executed: 0,
  },
  approval_cards: [
    {
      agent_type: "ops",
      action_title: "Q3 investor update email to Sarah",
      action_type: "draft_email",
      risk_level: "medium",
      reasoning:
        "Sarah asked for a Q3 snapshot before Thursday's partner meeting — time-sensitive investor reply.",
      preview: `Hi Sarah,

Quick Q3 snapshot as requested:

• MRR: $1,240 (+$340 since July)
• Runway: ~8 months at current burn ($4,200/mo)
• Shipped this month: approval gate UI, secure ops pipeline, hash-chained audit log

Happy to jump on Thursday 2pm PT. Let me know if you need anything else before the partner meeting.

— Jas`,
      consequence_approve:
        "Logged to audit. Gmail draft created in your inbox when Gmail is connected — otherwise preview stays on this card.",
      consequence_reject: "No action taken. Sarah's request stays in your queue.",
      payload: { to: "sarah.chen@sequoia.com", subject: "Q3 snapshot — KrewsAgent" },
    },
    {
      agent_type: "ops",
      action_title: "Thursday investor catch-up — confirm slot",
      action_type: "propose_meeting",
      risk_level: "low",
      reasoning: "Sarah is holding Thursday 2pm PT — a quick confirm keeps the relationship warm.",
      preview:
        "Proposed reply: \"Thursday 2pm PT works — see you then. I'll send the Q3 snapshot ahead of the call.\"",
      consequence_approve: "Logged to audit only. No calendar invite sends automatically.",
      consequence_reject: "Meeting confirmation deferred — you can reply manually later.",
      payload: { when: "Thursday 2pm PT", with: "Sarah Chen" },
    },
  ],
  deferred_items: ["12 newsletters, receipts, and automated notifications"],
  security_notes: ["External inbox content fenced and treated as untrusted input"],
  tars_model: "demo-fallback",
};

const GROWTH_FALLBACK: AgentRunOutput = {
  run_summary: "Growth crew drafted 2 public-facing actions from your shipped update.",
  stats: { items_reviewed: 1, actions_proposed: 2, approvals_created: 2, actions_executed: 0 },
  approval_cards: [
    {
      agent_type: "growth",
      action_title: "LinkedIn post draft",
      action_type: "draft_linkedin_post",
      risk_level: "medium",
      reasoning:
        "You shipped approval gate UI. Audience-first founders post 3x/week.",
      preview: `Most AI tools ask for your attention.

KrewsAgent asks for your approval.

It does the work — waits for you to say yes.`,
      consequence_approve:
        "Logged to audit — copy preview and paste into LinkedIn manually (no auto-post).",
      consequence_reject: "Discarded — no action taken.",
      payload: { platform: "linkedin", auto_post: false },
    },
    {
      agent_type: "growth",
      action_title: "Cold outreach sequence",
      action_type: "draft_outreach",
      risk_level: "medium",
      reasoning: "Pre-seed founders need 50+ touches/week.",
      preview: `Email 1: "Saw your ops burnout post"
Email 2 (+3d): "90-sec demo?"
Email 3 (+5d): "Last note"`,
      consequence_approve: "Logged to audit — outreach drafts saved on this card.",
      consequence_reject: "Discarded — no action taken.",
      payload: {},
    },
  ],
  deferred_items: [],
  security_notes: [],
  tars_model: "demo-fallback",
};

const SUPPORT_FALLBACK: AgentRunOutput = {
  run_summary: "Support crew reviewed 3 open GitHub issues. 3 replies drafted.",
  stats: { items_reviewed: 3, actions_proposed: 3, approvals_created: 3, actions_executed: 0 },
  approval_cards: [
    {
      agent_type: "support",
      action_title: "Reply to Megan — allergy concern",
      action_type: "draft_support_reply",
      risk_level: "high",
      reasoning: "Allergy/safety issue — highest priority, requires careful acknowledgment.",
      preview: `Hi Megan — thank you for flagging this, and I'm sorry you had that experience.

Your safety comes first. I'm pulling the recipe data for the flagged item today and will add a clearer allergen warning in the next release (target: this week).

If you'd like, reply with the specific recipe and I'll confirm what we have on file.

— Jas`,
      consequence_approve: "Logged to audit — reply preview saved. Nothing posts to GitHub.",
      consequence_reject: "No action taken. Issue stays open.",
      payload: { issue_number: 1 },
    },
    {
      agent_type: "support",
      action_title: "Reply to David — refund request",
      action_type: "draft_support_reply",
      risk_level: "medium",
      reasoning: "Billing/refund request — needs empathetic response without confirming refund as done.",
      preview: `Hi David — I hear you, and I want to make this right.

I'm reviewing your account and refund eligibility today. I'll follow up within 24 hours with next steps.

— Jas`,
      consequence_approve: "Logged to audit — reply preview saved. Refund is NOT processed automatically.",
      consequence_reject: "No action taken.",
      payload: { issue_number: 2 },
    },
    {
      agent_type: "support",
      action_title: "Reply to Priya — partner sharing",
      action_type: "draft_support_reply",
      risk_level: "low",
      reasoning: "Feature question about household sharing — straightforward support reply.",
      preview: `Hi Priya — great question! Partner sharing is on the roadmap for Q3.

For now, you can share your meal plan export via the ⋯ menu. I'll add you to the beta list for multi-user accounts.

— Jas`,
      consequence_approve: "Logged to audit — reply preview saved on this card.",
      consequence_reject: "No action taken.",
      payload: { issue_number: 3 },
    },
  ],
  deferred_items: [],
  security_notes: [],
  tars_model: "demo-fallback",
};

const FINANCE_FALLBACK: AgentRunOutput = {
  run_summary: "Finance crew produced a read-only health summary. No actions proposed.",
  stats: { items_reviewed: 4, actions_proposed: 1, approvals_created: 1, actions_executed: 0 },
  approval_cards: [
    {
      agent_type: "finance",
      action_title: "Financial health summary — May 2026",
      action_type: "finance_summary",
      risk_level: "low",
      reasoning: "Monthly snapshot from founder_context — read-only, no action required.",
      preview: `MRR: $1,240 (+$340 month-over-month)
Burn: $4,200/mo
Runway: ~8 months

What this means: You're growing but still pre-scale. Eight months gives room to ship and fundraise without panic — but every month of burn matters. Consider locking in 2-3 design partners before the next raise conversation.`,
      consequence_approve: "N/A — read-only summary.",
      consequence_reject: "N/A — read-only summary.",
      payload: {},
    },
  ],
  deferred_items: [],
  security_notes: ["Finance crew is read-only by design"],
  tars_model: "demo-fallback",
};

const FALLBACKS: Record<AgentType, AgentRunOutput> = {
  ops: OPS_FALLBACK,
  growth: GROWTH_FALLBACK,
  support: SUPPORT_FALLBACK,
  finance: FINANCE_FALLBACK,
};

export function getFallbackRun(agentType: AgentType): AgentRunOutput {
  return structuredClone(FALLBACKS[agentType]);
}
