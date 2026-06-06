import { getAuthorizedGmailClient } from "./client";
import {
  formatThreadBody,
  headerValue,
  type GmailThreadMessage,
} from "./formatThread";
import { senderTrustHint } from "./senderTrust";

export type InboxLocation = "inbox" | "spam" | "promotions" | "updates";

export interface InboxMessage {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  body: string;
  location: InboxLocation;
  messageCount: number;
}

const LOCATION_QUERIES: { location: InboxLocation; query: string; max: number }[] = [
  { location: "inbox", query: "in:inbox category:primary newer_than:14d", max: 10 },
  { location: "spam", query: "in:spam newer_than:14d", max: 5 },
  { location: "promotions", query: "in:inbox category:promotions newer_than:14d", max: 5 },
  { location: "updates", query: "in:inbox category:updates newer_than:14d", max: 5 },
];

function locationLabel(location: InboxLocation): string {
  switch (location) {
    case "spam":
      return "Spam";
    case "promotions":
      return "Promotions";
    case "updates":
      return "Updates";
    default:
      return "Inbox";
  }
}

export function formatInboxMessageContent(msg: InboxMessage): string {
  const hint = senderTrustHint(msg.from, msg.subject, msg.location);
  const header = [
    `Location: ${locationLabel(msg.location)}`,
    msg.messageCount > 1 ? `Thread: ${msg.messageCount} messages (full history below)` : null,
    `From: ${msg.from}`,
    `Subject: ${msg.subject}`,
    hint ? hint : null,
  ]
    .filter(Boolean)
    .join("\n");
  return `${header}\n\n${msg.body}`;
}

interface ThreadRef {
  threadId: string;
  location: InboxLocation;
}

async function listThreadRefs(
  gmail: NonNullable<Awaited<ReturnType<typeof getAuthorizedGmailClient>>>,
  location: InboxLocation,
  query: string,
  max: number
): Promise<ThreadRef[]> {
  const list = await gmail.users.messages.list({
    userId: "me",
    maxResults: max * 2,
    q: query,
  });

  const refs: ThreadRef[] = [];
  const seenThreads = new Set<string>();

  for (const ref of list.data.messages ?? []) {
    if (!ref.threadId) continue;
    if (seenThreads.has(ref.threadId)) continue;
    seenThreads.add(ref.threadId);
    refs.push({ threadId: ref.threadId, location });
    if (refs.length >= max) break;
  }

  return refs;
}

async function fetchThreadMessage(
  gmail: NonNullable<Awaited<ReturnType<typeof getAuthorizedGmailClient>>>,
  ref: ThreadRef
): Promise<InboxMessage | null> {
  const thread = await gmail.users.threads.get({
    userId: "me",
    id: ref.threadId,
    format: "full",
  });

  const messages = (thread.data.messages ?? []) as GmailThreadMessage[];
  if (messages.length === 0) return null;

  const sorted = [...messages].sort(
    (a, b) => Number(a.internalDate ?? 0) - Number(b.internalDate ?? 0)
  );
  const latest = sorted[sorted.length - 1];
  if (!latest.id) return null;

  const headers = latest.payload?.headers;
  const from = headerValue(headers, "From");
  const subject = headerValue(headers, "Subject") || "(no subject)";
  const body = formatThreadBody(messages);

  return {
    id: latest.id,
    threadId: ref.threadId,
    from,
    subject,
    body,
    location: ref.location,
    messageCount: messages.length,
  };
}

export async function isGmailConnected(userId: string): Promise<boolean> {
  const gmail = await getAuthorizedGmailClient(userId);
  return !!gmail;
}

/** Inbox + spam + promotions/updates — deduped by thread, includes prior replies */
export async function fetchInboxMessages(
  userId: string,
  max = 15
): Promise<{ messages: InboxMessage[]; live: boolean }> {
  const gmail = await getAuthorizedGmailClient(userId);
  if (!gmail) {
    return { messages: [], live: false };
  }

  try {
    const seenThreads = new Set<string>();
    const merged: InboxMessage[] = [];

    for (const { location, query, max: bucketMax } of LOCATION_QUERIES) {
      const refs = await listThreadRefs(gmail, location, query, bucketMax);
      for (const ref of refs) {
        if (seenThreads.has(ref.threadId)) continue;
        seenThreads.add(ref.threadId);

        const msg = await fetchThreadMessage(gmail, ref);
        if (msg) merged.push(msg);
        if (merged.length >= max) break;
      }
      if (merged.length >= max) break;
    }

    return { messages: merged, live: true };
  } catch {
    return { messages: [], live: false };
  }
}
