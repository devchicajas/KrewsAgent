import type { InboxMessage } from "./fetchInbox";
import { extractEmailAddress } from "./buildMessage";

export interface GmailReplyContext {
  threadId: string;
  rfcMessageId: string;
  subject: string;
  itemId: string;
}

/** Map recipient email (original sender) → thread metadata for replies */
export function buildGmailReplyContext(
  messages: InboxMessage[]
): Map<string, GmailReplyContext> {
  const map = new Map<string, GmailReplyContext>();
  for (const msg of messages) {
    if (!msg.rfcMessageId || !msg.threadId) continue;
    const recipient = extractEmailAddress(msg.from);
    map.set(recipient, {
      threadId: msg.threadId,
      rfcMessageId: msg.rfcMessageId,
      subject: msg.subject,
      itemId: msg.id,
    });
  }
  return map;
}

export function normalizeMessageId(messageId: string): string {
  const trimmed = messageId.trim();
  if (trimmed.startsWith("<") && trimmed.endsWith(">")) return trimmed;
  return `<${trimmed}>`;
}

export function replySubject(subject: string): string {
  const s = subject.trim() || "your message";
  return /^re:/i.test(s) ? s : `Re: ${s}`;
}
