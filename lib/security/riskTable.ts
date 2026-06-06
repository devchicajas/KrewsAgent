import type { RiskLevel } from "@/lib/types/agent";
import { ALLOWED_ACTIONS, type AllowedActionType } from "./outputValidation";

const RISK_ORDER: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };

const RISK_FLOORS: Record<AllowedActionType, RiskLevel> = {
  draft_email: "medium",
  propose_meeting: "low",
  draft_linkedin_post: "medium",
  draft_outreach: "medium",
  draft_support_reply: "low",
  finance_summary: "low",
  security_advisory: "low",
};

export function getRiskFloor(actionType: string): RiskLevel {
  if (actionType in RISK_FLOORS) {
    return RISK_FLOORS[actionType as AllowedActionType];
  }
  return "high";
}

export function applyRiskFloor(modelRisk: RiskLevel, actionType: string): RiskLevel {
  const floor = getRiskFloor(actionType);
  return RISK_ORDER[modelRisk] >= RISK_ORDER[floor] ? modelRisk : floor;
}

export function applyRiskBounds(modelRisk: RiskLevel, actionType: string): RiskLevel {
  let risk = applyRiskFloor(modelRisk, actionType);
  const config =
    actionType in ALLOWED_ACTIONS
      ? ALLOWED_ACTIONS[actionType as AllowedActionType]
      : undefined;
  if (config && RISK_ORDER[risk] > RISK_ORDER[config.maxRisk]) {
    risk = config.maxRisk;
  }
  return risk;
}
