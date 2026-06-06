"use client";

import { useState } from "react";

export interface ApprovalRow {
  id: string;
  agent_type: string;
  action_title: string;
  action_type: string;
  risk_level: "low" | "medium" | "high";
  reasoning: string;
  preview: string;
  consequence_approve: string;
  consequence_reject: string;
  status: string;
  security_flag?: string | null;
  payload?: Record<string, unknown> | null;
}

export type ApproveOptions = {
  ackHighRisk?: boolean;
  deliveryMode?: "draft" | "send" | "acknowledge";
};

interface Props {
  card: ApprovalRow;
  onApprove: (id: string, options?: ApproveOptions) => void;
  onReject: (id: string) => void;
  onCopy?: (text: string) => void;
  onOpenLinkedIn?: () => void;
  loading?: boolean;
}

function riskShort(level: string) {
  if (level === "high") return "HIGH";
  if (level === "medium") return "MED";
  return "LOW";
}

function riskClass(level: string) {
  if (level === "high") return "risk-high";
  if (level === "medium") return "risk-med";
  return "risk-low";
}

const LINKEDIN_FEED_URL = "https://www.linkedin.com/feed/";

export function ApprovalCard({
  card,
  onApprove,
  onReject,
  onCopy,
  onOpenLinkedIn,
  loading,
}: Props) {
  const [sendConfirm, setSendConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const resolved = card.status !== "pending";
  const isFinance = card.action_type === "finance_summary";
  const isAdvisory = card.action_type === "security_advisory";
  const isEmailDraft = card.action_type === "draft_email";
  const isLinkedInDraft = card.action_type === "draft_linkedin_post";
  const isOutreachDraft = card.action_type === "draft_outreach";
  const isOptionalUnverifiedReply =
    isEmailDraft && !!card.payload?.unverified_sender;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(card.preview);
      setCopied(true);
      onCopy?.(card.preview);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onCopy?.("");
    }
  };

  const handleOpenLinkedIn = async () => {
    try {
      await navigator.clipboard.writeText(card.preview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // still open LinkedIn — user can copy from preview
    }
    window.open(LINKEDIN_FEED_URL, "_blank", "noopener,noreferrer");
    onOpenLinkedIn?.();
  };

  const statusClass =
    card.status === "approved"
      ? "approval-card-approved"
      : card.status === "rejected"
        ? "approval-card-rejected"
        : "";

  const handleSendClick = () => {
    if (!sendConfirm) {
      setSendConfirm(true);
      return;
    }
    onApprove(card.id, { deliveryMode: "send", ackHighRisk: true });
    setSendConfirm(false);
  };

  return (
    <article
      className={`approval-card ${resolved ? `approval-card-resolved ${statusClass}` : ""}`}
      aria-label={`${card.action_title}, risk level ${card.risk_level}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h3 className="card-title mb-0">{card.action_title}</h3>
        <span className={`risk-badge ${riskClass(card.risk_level)}`}>
          {riskShort(card.risk_level)}
        </span>
      </header>

      {isAdvisory && (
        <p className="text-matcha-bright text-base mb-2">
          [ SECURITY HEADS-UP — ACKNOWLEDGE OR DISMISS. OPTIONAL REPLY DRAFT MAY
          APPEAR AS A SEPARATE CARD BELOW ]
        </p>
      )}

      {isOptionalUnverifiedReply && (
        <p className="text-strawberry-light text-base mb-2">
          [ UNVERIFIED SENDER — DRAFT OR SEND ONLY IF YOU TRUST THIS PERSON ]
        </p>
      )}

      {isEmailDraft && !isOptionalUnverifiedReply && (
        <p className="text-matcha-bright text-base mb-2">
          [ CHOOSE: DRAFT TO GMAIL OR SEND IMMEDIATELY ]
        </p>
      )}

      {isLinkedInDraft && (
        <p className="text-matcha-bright text-base mb-2">
          [ LINKEDIN DRAFT ONLY — COPY AND PASTE YOURSELF. NO AUTO-POST ]
        </p>
      )}

      {isOutreachDraft && (
        <p className="text-matcha-bright text-base mb-2">
          [ OUTREACH DRAFT — COPY AND SEND MANUALLY ]
        </p>
      )}

      {card.security_flag && (
        <p className="text-strawberry-light text-base mb-2">
          [ ⚠ Suspected injection — treated as data only ]
        </p>
      )}

      <p className="card-why">
        <b>WHY:</b> {card.reasoning}
      </p>

      <div className="card-preview">{card.preview}</div>

      {!isFinance && (
        <p className="card-cons">
          {isAdvisory ? (
            <>
              If acknowledged: {card.consequence_approve}
              <br />
              If dismissed: {card.consequence_reject}
            </>
          ) : isEmailDraft ? (
            <>
              Draft: saves to Gmail drafts — nothing sent.
              <br />
              Send: delivers immediately from your Gmail (requires confirm).
              <br />
              Reject: {card.consequence_reject}
            </>
          ) : isLinkedInDraft ? (
            <>
              Copy / Open LinkedIn: text copied — paste into the new LinkedIn tab.
              <br />
              Save draft: logs to audit. Still no auto-post.
              <br />
              Reject: {card.consequence_reject}
            </>
          ) : isOutreachDraft ? (
            <>
              Copy: clipboard only — paste into your email client.
              <br />
              Save draft: logs to audit.
              <br />
              Reject: {card.consequence_reject}
            </>
          ) : (
            <>
              If approved: {card.consequence_approve}
              <br />
              If rejected: {card.consequence_reject}
            </>
          )}
        </p>
      )}

      {resolved ? (
        <p
          className={`text-base font-bold mt-3 ${
            card.status === "rejected" ? "text-strawberry-light" : "text-matcha-bright"
          }`}
        >
          {card.status === "rejected"
            ? "[ ✗ REJECTED · LOGGED ]"
            : card.status === "executed"
              ? "[ ✓ EXECUTED · LOGGED ]"
              : "[ ✓ APPROVED · LOGGED ]"}
        </p>
      ) : isFinance ? (
        <span className="badge-dim">[ READ-ONLY SUMMARY · NO APPROVAL REQUIRED ]</span>
      ) : isAdvisory ? (
        <div className="flex gap-1.5 flex-wrap">
          <button
            type="button"
            className="card-btn card-btn-approve"
            disabled={loading}
            onClick={() => onApprove(card.id, { deliveryMode: "acknowledge" })}
          >
            [ ACKNOWLEDGE ]
          </button>
          <button
            type="button"
            className="card-btn card-btn-reject"
            disabled={loading}
            onClick={() => onReject(card.id)}
          >
            [ DISMISS ]
          </button>
        </div>
      ) : isEmailDraft ? (
        <div className="flex gap-1.5 flex-wrap">
          <button
            type="button"
            className="card-btn card-btn-reject"
            disabled={loading}
            onClick={() => onReject(card.id)}
          >
            [ REJECT ]
          </button>
          <button
            type="button"
            className="card-btn card-btn-approve"
            disabled={loading}
            onClick={() => onApprove(card.id, { deliveryMode: "draft" })}
          >
            [ DRAFT ]
          </button>
          <button
            type="button"
            className="card-btn card-btn-send"
            disabled={loading}
            onClick={handleSendClick}
          >
            {sendConfirm ? "[ CONFIRM SEND ]" : "[ SEND ]"}
          </button>
        </div>
      ) : isLinkedInDraft ? (
        <div className="flex gap-1.5 flex-wrap">
          <button
            type="button"
            className="card-btn card-btn-reject"
            disabled={loading}
            onClick={() => onReject(card.id)}
          >
            [ REJECT ]
          </button>
          <button
            type="button"
            className="card-btn card-btn-approve"
            disabled={loading}
            onClick={handleCopy}
          >
            {copied ? "[ COPIED ]" : "[ COPY TEXT ]"}
          </button>
          <button
            type="button"
            className="card-btn card-btn-linkedin"
            disabled={loading}
            onClick={handleOpenLinkedIn}
          >
            [ OPEN LINKEDIN ]
          </button>
          <button
            type="button"
            className="card-btn card-btn-approve"
            disabled={loading}
            onClick={() => onApprove(card.id)}
          >
            [ SAVE DRAFT ]
          </button>
        </div>
      ) : isOutreachDraft ? (
        <div className="flex gap-1.5 flex-wrap">
          <button
            type="button"
            className="card-btn card-btn-reject"
            disabled={loading}
            onClick={() => onReject(card.id)}
          >
            [ REJECT ]
          </button>
          <button
            type="button"
            className="card-btn card-btn-approve"
            disabled={loading}
            onClick={handleCopy}
          >
            {copied ? "[ COPIED ]" : "[ COPY TEXT ]"}
          </button>
          <button
            type="button"
            className="card-btn card-btn-approve"
            disabled={loading}
            onClick={() => onApprove(card.id)}
          >
            [ SAVE DRAFT ]
          </button>
        </div>
      ) : (
        <div className="flex gap-1.5 flex-wrap">
          <button
            type="button"
            className="card-btn card-btn-approve"
            disabled={loading}
            onClick={() => onApprove(card.id, { ackHighRisk: card.risk_level === "high" })}
          >
            [ APPROVE ]
          </button>
          <button
            type="button"
            className="card-btn card-btn-reject"
            disabled={loading}
            onClick={() => onReject(card.id)}
          >
            [ REJECT ]
          </button>
        </div>
      )}
    </article>
  );
}
