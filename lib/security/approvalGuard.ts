import { createServiceClient } from "@/lib/supabase/server";
import { tryCreateGmailDraft } from "@/lib/gmail/createDraft";
import { trySendGmailMessage } from "@/lib/gmail/sendEmail";
import { tryPostIssueComment } from "@/lib/github/postComment";
import { ALLOWED_ACTIONS, type AllowedActionType } from "./outputValidation";
import { safeWriteAuditEntry, writeAuditEntry } from "./audit";

export interface ExecutionDecision {
  allowed: boolean;
  reason: string;
  executed_action_type: string | null;
}

export type EmailDeliveryMode = "draft" | "send" | "acknowledge";

export async function executeApproval(
  approvalId: string,
  userId: string,
  ack: { highRisk?: boolean; deliveryMode?: EmailDeliveryMode }
): Promise<ExecutionDecision> {
  const supabase = createServiceClient();

  const { data: claimed, error: claimError } = await supabase
    .from("approvals")
    .update({ status: "approved" })
    .eq("id", approvalId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (claimError || !claimed) {
    await writeAuditEntry({
      user_id: userId,
      agent_type: "system",
      action: "approval_claim_failed",
      reasoning: claimError?.message ?? "Not pending or not found",
      status: "denied",
    });
    return {
      allowed: false,
      reason: "Approval not found or already resolved",
      executed_action_type: null,
    };
  }

  if (!(claimed.action_type in ALLOWED_ACTIONS)) {
    await supabase
      .from("approvals")
      .update({ status: "denied" })
      .eq("id", approvalId);
    await writeAuditEntry({
      user_id: userId,
      agent_type: claimed.agent_type,
      action: "allowlist_rejected",
      reasoning: `Unknown action_type: ${claimed.action_type}`,
      status: "denied",
    });
    return {
      allowed: false,
      reason: "Action type not on allowlist",
      executed_action_type: null,
    };
  }

  if (claimed.action_type === "finance_summary") {
    await supabase
      .from("approvals")
      .update({ status: "denied" })
      .eq("id", approvalId);
    return {
      allowed: false,
      reason: "Finance actions are read-only",
      executed_action_type: null,
    };
  }

  const deliveryMode =
    ack.deliveryMode ??
    (claimed.action_type === "security_advisory" ? "acknowledge" : "draft");

  if (deliveryMode === "send" && !ack.highRisk) {
    await supabase
      .from("approvals")
      .update({ status: "pending" })
      .eq("id", approvalId);
    await writeAuditEntry({
      user_id: userId,
      agent_type: claimed.agent_type,
      action: "send_confirmation_required",
      reasoning: claimed.action_title,
      status: "denied",
    });
    return {
      allowed: false,
      reason: "Sending email requires explicit confirmation — press SEND again to confirm",
      executed_action_type: null,
    };
  }

  if (claimed.risk_level === "high" && !ack.highRisk && deliveryMode !== "send") {
    await supabase
      .from("approvals")
      .update({ status: "pending" })
      .eq("id", approvalId);
    await writeAuditEntry({
      user_id: userId,
      agent_type: claimed.agent_type,
      action: "high_risk_ack_required",
      reasoning: claimed.action_title,
      status: "denied",
    });
    return {
      allowed: false,
      reason: "High-risk actions require explicit acknowledgment",
      executed_action_type: null,
    };
  }

  const actionConfig = ALLOWED_ACTIONS[claimed.action_type as AllowedActionType];
  const payload = (claimed.payload ?? {}) as Record<string, unknown>;

  let sideEffectNote = "logged_to_audit";
  let gmailDraftId: string | undefined;
  let githubCommentUrl: string | undefined;

  if (claimed.action_type === "draft_email") {
    const emailPayload = {
      to: typeof payload.to === "string" ? payload.to : undefined,
      subject: typeof payload.subject === "string" ? payload.subject : undefined,
    };

    if (deliveryMode === "send") {
      const sendResult = await trySendGmailMessage(userId, emailPayload, claimed.preview);
      if (sendResult.sent) {
        sideEffectNote = "gmail_message_sent";
      } else {
        sideEffectNote = `logged_only:${sendResult.reason ?? "gmail_not_connected"}`;
      }
    } else {
      const draftResult = await tryCreateGmailDraft(userId, emailPayload, claimed.preview);
      if (draftResult.created) {
        sideEffectNote = "gmail_draft_created";
        gmailDraftId = draftResult.draftId;
      } else {
        sideEffectNote = `logged_only:${draftResult.reason ?? "gmail_not_connected"}`;
      }
    }
  }

  if (claimed.action_type === "draft_support_reply") {
    const commentResult = await tryPostIssueComment(
      userId,
      payload,
      claimed.preview
    );
    if (commentResult.created) {
      sideEffectNote = "github_comment_posted";
      githubCommentUrl = commentResult.commentUrl;
    } else {
      sideEffectNote = `logged_only:${commentResult.reason ?? "github_not_connected"}`;
    }
  }

  await supabase
    .from("approvals")
    .update({ status: "executed", resolved_at: new Date().toISOString() })
    .eq("id", approvalId);

  await safeWriteAuditEntry({
    user_id: userId,
    agent_type: claimed.agent_type,
    action: `executed:${claimed.action_type}`,
    reasoning: claimed.action_title,
    status: "executed",
    details: {
      side_effect: actionConfig.sideEffect,
      side_effect_result: sideEffectNote,
      delivery_mode: deliveryMode,
      gmail_draft_id: gmailDraftId,
      github_comment_url: githubCommentUrl,
      action_title: claimed.action_title,
    },
  });

  const reason =
    sideEffectNote === "gmail_message_sent"
      ? "Email sent from your Gmail — logged to audit"
      : sideEffectNote === "gmail_draft_created"
      ? "Gmail draft created — nothing sent"
      : sideEffectNote === "github_comment_posted"
        ? "GitHub comment posted on issue"
        : claimed.action_type === "draft_linkedin_post"
          ? "Draft saved — copy text from the card and paste into LinkedIn (no auto-post)"
          : claimed.action_type === "draft_outreach"
            ? "Outreach draft saved to audit — copy and send manually"
            : sideEffectNote.startsWith("logged_only")
              ? claimed.action_type === "draft_email"
                ? "Logged to audit — connect Gmail to create drafts in your inbox"
                : claimed.action_type === "draft_support_reply"
                  ? "Logged to audit — connect GitHub to post comments on approve"
                  : "Logged to audit"
              : claimed.action_type === "security_advisory"
                ? "Advisory acknowledged — logged to audit"
                : "Action logged to audit";

  return {
    allowed: true,
    reason,
    executed_action_type: claimed.action_type,
  };
}

export async function rejectApproval(
  approvalId: string,
  userId: string
): Promise<ExecutionDecision> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("approvals")
    .update({ status: "rejected", resolved_at: new Date().toISOString() })
    .eq("id", approvalId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return {
      allowed: false,
      reason: "Approval not found or already resolved",
      executed_action_type: null,
    };
  }

  await safeWriteAuditEntry({
    user_id: userId,
    agent_type: data.agent_type,
    action: `rejected:${data.action_type}`,
    reasoning: data.action_title,
    status: "rejected",
  });

  return {
    allowed: true,
    reason: "Rejected — no side effects",
    executed_action_type: null,
  };
}
