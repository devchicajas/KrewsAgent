import type { AgentRunOutput } from "@/lib/types/agent";
import { createServiceClient } from "@/lib/supabase/server";
import { filterAllowedCards } from "@/lib/security/outputValidation";
import { applyRiskBounds } from "@/lib/security/riskTable";
import { safeWriteAuditEntry } from "@/lib/security/audit";
import type { UntrustedItem } from "@/lib/security/untrustedInput";
import {
  extractEmailAddress,
  parseLeadingEmailHeaders,
} from "@/lib/gmail/buildMessage";
import {
  type GmailReplyContext,
  replySubject,
} from "@/lib/gmail/replyContext";
import { ensureOptionalReplyDrafts } from "@/lib/pipeline/ensureOptionalReplyDraft";

function attachGmailThreadPayload(
  payload: Record<string, unknown>,
  gmailReplyContext?: Map<string, GmailReplyContext>
): Record<string, unknown> {
  if (!gmailReplyContext?.size) return payload;

  let ctx: GmailReplyContext | undefined;
  const itemId = typeof payload.item_id === "string" ? payload.item_id : undefined;
  if (itemId) {
    ctx = Array.from(gmailReplyContext.values()).find((c) => c.itemId === itemId);
  }
  if (!ctx && typeof payload.to === "string") {
    ctx = gmailReplyContext.get(extractEmailAddress(payload.to));
  }
  if (!ctx) return payload;

  const subject =
    typeof payload.subject === "string" && payload.subject.trim()
      ? payload.subject
      : replySubject(ctx.subject);

  return {
    ...payload,
    thread_id: ctx.threadId,
    in_reply_to: ctx.rfcMessageId,
    subject,
  };
}

export async function createApprovalsFromOutput(
  userId: string,
  agentType: string,
  output: AgentRunOutput,
  processedItems: UntrustedItem[],
  usedFallback: boolean,
  gmailReplyContext?: Map<string, GmailReplyContext>
): Promise<string[]> {
  const enriched =
    agentType === "ops"
      ? ensureOptionalReplyDrafts(output, processedItems)
      : output;
  const { allowed, dropped } = filterAllowedCards(enriched.approval_cards);

  for (const card of dropped) {
    await safeWriteAuditEntry({
      user_id: userId,
      agent_type: agentType,
      action: "proposal_dropped_allowlist",
      reasoning: card.action_type,
      status: "denied",
    });
  }

  const supabase = createServiceClient();
  const approvalIds: string[] = [];

  for (const card of allowed.slice(0, 3)) {
    const risk = applyRiskBounds(card.risk_level, card.action_type);
    const flag =
      processedItems.find((i) => card.reasoning.includes(i.id))?.security_flag ?? null;

    let preview = card.preview;
    let payload = { ...(card.payload ?? {}) } as Record<string, unknown>;

    if (card.action_type === "draft_email") {
      const parsed = parseLeadingEmailHeaders(card.preview);
      preview = parsed.body;
      if (!payload.to && parsed.to) payload.to = parsed.to;
      if (!payload.subject && parsed.subject) payload.subject = parsed.subject;
      if (typeof payload.to === "string") {
        payload.to = extractEmailAddress(payload.to);
      }
      payload = attachGmailThreadPayload(payload, gmailReplyContext);
    }

    const { data, error } = await supabase
      .from("approvals")
      .insert({
        user_id: userId,
        agent_type: card.agent_type,
        action_title: card.action_title,
        action_type: card.action_type,
        risk_level: risk,
        reasoning: card.reasoning,
        preview,
        consequence_approve: card.consequence_approve,
        consequence_reject: card.consequence_reject,
        payload,
        status: "pending",
        security_flag: flag,
      })
      .select("id")
      .single();

    if (!error && data) approvalIds.push(data.id);
  }

  enriched.stats.approvals_created = approvalIds.length;
  enriched.stats.actions_executed = 0;
  Object.assign(output, enriched);

  await safeWriteAuditEntry({
    user_id: userId,
    agent_type: agentType,
    action: "run_completed",
    reasoning: enriched.run_summary,
    status: "success",
    tars_model: output.tars_model,
    details: {
      used_fallback: usedFallback,
      approvals_created: approvalIds.length,
      proposals_dropped: dropped.length,
    },
  });

  return approvalIds;
}
