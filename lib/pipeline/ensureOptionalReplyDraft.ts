import type { AgentRunOutput, ApprovalCard } from "@/lib/types/agent";
import type { UntrustedItem } from "@/lib/security/untrustedInput";
import { extractEmailAddress } from "@/lib/gmail/buildMessage";
import { replySubject } from "@/lib/gmail/replyContext";

export interface EmailItemMeta {
  itemId: string;
  from: string;
  fromRaw: string;
  subject: string;
}

const ITEM_ID_RE = /Item-ID:\s*(\S+)/i;
const FROM_RE = /^From:\s*(.+)$/im;
const SUBJECT_RE = /^Subject:\s*(.+)$/im;

export function parseEmailItemMeta(content: string): Partial<EmailItemMeta> | null {
  const itemId = content.match(ITEM_ID_RE)?.[1];
  const fromRaw = content.match(FROM_RE)?.[1]?.trim();
  const subject = content.match(SUBJECT_RE)?.[1]?.trim();
  if (!fromRaw) return null;

  return {
    itemId: itemId ?? "",
    from: extractEmailAddress(fromRaw),
    fromRaw,
    subject: subject ?? "(no subject)",
  };
}

function advisoryMentionsItem(advisory: ApprovalCard, item: UntrustedItem): boolean {
  const haystack = `${advisory.action_title} ${advisory.reasoning} ${advisory.preview}`.toLowerCase();
  if (item.id && haystack.includes(item.id.toLowerCase())) return true;

  const meta = parseEmailItemMeta(item.content);
  if (!meta?.from) return false;

  if (haystack.includes(meta.from)) return true;
  if (meta.subject && haystack.includes(meta.subject.toLowerCase())) return true;
  if (meta.fromRaw && haystack.includes(meta.fromRaw.toLowerCase())) return true;

  return false;
}

function findRelatedEmailItem(
  advisory: ApprovalCard,
  processedItems: UntrustedItem[]
): (UntrustedItem & { meta: EmailItemMeta }) | null {
  const emailItems = processedItems
    .map((item) => {
      const parsed = parseEmailItemMeta(item.content);
      if (!parsed?.from) return null;
      return {
        item,
        meta: {
          itemId: parsed.itemId || item.id,
          from: parsed.from,
          fromRaw: parsed.fromRaw!,
          subject: parsed.subject ?? "(no subject)",
        },
      };
    })
    .filter((x): x is { item: UntrustedItem; meta: EmailItemMeta } => x !== null);

  const direct = emailItems.find(({ item }) => advisoryMentionsItem(advisory, item));
  if (direct) return { ...direct.item, meta: direct.meta };

  const unverified = emailItems.find(({ item }) =>
    item.content.includes("Sender trust: unverified")
  );
  if (unverified) return { ...unverified.item, meta: unverified.meta };

  return emailItems[0] ? { ...emailItems[0].item, meta: emailItems[0].meta } : null;
}

function buildVerificationReplyBody(subject: string): string {
  const claimsVc = /sequoia|a16z|andreessen|benchmark|accel|y combinator|greylock/i.test(
    subject
  );

  const verificationLine = claimsVc
    ? "Before I share any company metrics, I'll need verification from an official firm email domain (not a personal Gmail/Outlook address) or a mutual intro we both recognize."
    : "Before I share any company metrics or sensitive details, I'll need sender identity verified through an official work email or a mutual contact we both trust.";

  return `Hi — thanks for following up.

${verificationLine}

I can't respond to financial data requests from unverified personal accounts. Happy to reconnect once identity is confirmed.

Best`;
}

export function buildOptionalReplyDraftCard(
  meta: EmailItemMeta,
  advisory: ApprovalCard
): ApprovalCard {
  const subject = replySubject(meta.subject);
  const preview = buildVerificationReplyBody(meta.subject);

  return {
    agent_type: advisory.agent_type,
    action_title: `Optional reply (unverified sender): ${meta.subject}`,
    action_type: "draft_email",
    risk_level: "medium",
    reasoning: `Cautious reply draft paired with security advisory — sender ${meta.from} is unverified. No financial data included. Founder chooses DRAFT or SEND.`,
    preview,
    consequence_approve: "Creates a Gmail draft (or sends if you confirm SEND) — still your call after the warning.",
    consequence_reject: "No reply drafted or sent.",
    payload: {
      unverified_sender: true,
      to: meta.from,
      subject,
      item_id: meta.itemId || undefined,
      paired_security_advisory: true,
    },
  };
}

function hasOptionalUnverifiedDraft(cards: ApprovalCard[]): boolean {
  return cards.some(
    (c) => c.action_type === "draft_email" && !!c.payload?.unverified_sender
  );
}

function prioritizeCards(cards: ApprovalCard[]): ApprovalCard[] {
  const advisories = cards.filter((c) => c.action_type === "security_advisory");
  const optionalDrafts = cards.filter(
    (c) => c.action_type === "draft_email" && c.payload?.unverified_sender
  );
  const rest = cards.filter((c) => !advisories.includes(c) && !optionalDrafts.includes(c));
  return [...advisories, ...optionalDrafts, ...rest].slice(0, 3);
}

/** When TARS emits security_advisory alone, add a cautious optional reply draft for email threads. */
export function ensureOptionalReplyDrafts(
  output: AgentRunOutput,
  processedItems: UntrustedItem[]
): AgentRunOutput {
  if (hasOptionalUnverifiedDraft(output.approval_cards)) {
    return { ...output, approval_cards: prioritizeCards(output.approval_cards) };
  }

  const advisories = output.approval_cards.filter(
    (c) => c.action_type === "security_advisory"
  );
  if (advisories.length === 0) return output;

  const extra: ApprovalCard[] = [];
  for (const advisory of advisories) {
    const related = findRelatedEmailItem(advisory, processedItems);
    if (!related) continue;
    extra.push(buildOptionalReplyDraftCard(related.meta, advisory));
    break;
  }

  if (extra.length === 0) return output;

  const approval_cards = prioritizeCards([...output.approval_cards, ...extra]);
  return {
    ...output,
    approval_cards,
    stats: {
      ...output.stats,
      actions_proposed: approval_cards.length,
    },
  };
}
