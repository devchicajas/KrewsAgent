export type RiskLevel = "low" | "medium" | "high";
export type AgentType = "ops" | "growth" | "support" | "finance";

export interface ApprovalCard {
  agent_type: AgentType;
  action_title: string;
  action_type: string;
  risk_level: RiskLevel;
  reasoning: string;
  preview: string;
  consequence_approve: string;
  consequence_reject: string;
  payload: Record<string, unknown>;
}

export interface AgentRunOutput {
  run_summary: string;
  stats: {
    items_reviewed: number;
    actions_proposed: number;
    approvals_created: number;
    actions_executed: number;
  };
  approval_cards: ApprovalCard[];
  deferred_items: string[];
  security_notes: string[];
  tars_model: string;
}

export interface ClassifyResult {
  item_id: string;
  label: "URGENT" | "REPLY_NEEDED" | "FYI" | "NOISE";
  suspected_injection: boolean;
}
