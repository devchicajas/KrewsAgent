import { getAuthorizedGmailClient } from "./client";
import { senderTrustHint } from "./senderTrust";

export type InboxLocation = "inbox" | "spam" | "promotions" | "updates";

export interface InboxMessage {
  id: string;
  from: string;
  subject: string;
  body: string;
  location: InboxLocation;
}

const LOCATION_QUERIES: { location: InboxLocation; query: string; max: number }[] = [
  { location: "inbox", query: "in:inbox category:primary newer_than:14d", max: 10 },
  { location: "spam", query: "in:spam newer_than:14d", max: 5 },
  { location: "promotions", query: "in:inbox category:promotions newer_than:14d", max: 5 },
  { location: "updates", query: "in:inbox category:updates newer_than:14d", max: 5 },
];

function headerValue(
  headers: Array<{ name?: string | null; value?: string | null }> | undefined,
  name: string
): string {
  const h = headers?.find((x) => x.name?.toLowerCase() === name.toLowerCase());
  return h?.value ?? "";
}

function decodeBody(data: string): string {
  try {
    return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
      "utf-8"
    );
  } catch {
    return data;
  }
}

function extractPlainBody(
  payload: {
    mimeType?: string | null;
    body?: { data?: string | null };
    parts?: Array<{
      mimeType?: string | null;
      body?: { data?: string | null };
      parts?: unknown[];
    }>;
  } | null | undefined
): string {
  if (!payload) return "";

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBody(payload.body.data);
  }

  for (const part of payload.parts ?? []) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      return decodeBody(part.body.data);
    }
  }

  for (const part of payload.parts ?? []) {
    if (part.mimeType === "text/html" && part.body?.data) {
      const html = decodeBody(part.body.data);
      return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }
  }

  if (payload.body?.data) {
    return decodeBody(payload.body.data);
  }

  return "";
}

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
    `From: ${msg.from}`,
    `Subject: ${msg.subject}`,
    hint ? hint : null,
  ]
    .filter(Boolean)
    .join("\n");
  return `${header}\n\n${msg.body}`;
}

async function fetchFromQuery(
  gmail: Awaited<ReturnType<typeof getAuthorizedGmailClient>>,
  location: InboxLocation,
  query: string,
  max: number
): Promise<InboxMessage[]> {
  if (!gmail) return [];

  const list = await gmail.users.messages.list({
    userId: "me",
    maxResults: max,
    q: query,
  });

  const refs = list.data.messages ?? [];
  const messages: InboxMessage[] = [];

  for (const ref of refs.slice(0, max)) {
    if (!ref.id) continue;
    const full = await gmail.users.messages.get({
      userId: "me",
      id: ref.id,
      format: "full",
    });

    const headers = full.data.payload?.headers;
    const from = headerValue(headers, "From");
    const subject = headerValue(headers, "Subject") || "(no subject)";
    const body =
      extractPlainBody(full.data.payload) || full.data.snippet || "";

    messages.push({
      id: ref.id,
      from,
      subject,
      body: body.slice(0, 4000),
      location,
    });
  }

  return messages;
}

export async function isGmailConnected(userId: string): Promise<boolean> {
  const gmail = await getAuthorizedGmailClient(userId);
  return !!gmail;
}

/** Inbox + spam + promotions/updates tabs — deduped, capped at max */
export async function fetchInboxMessages(
  userId: string,
  max = 15
): Promise<{ messages: InboxMessage[]; live: boolean }> {
  const gmail = await getAuthorizedGmailClient(userId);
  if (!gmail) {
    return { messages: [], live: false };
  }

  try {
    const seen = new Set<string>();
    const merged: InboxMessage[] = [];

    for (const { location, query, max: bucketMax } of LOCATION_QUERIES) {
      const batch = await fetchFromQuery(gmail, location, query, bucketMax);
      for (const msg of batch) {
        if (seen.has(msg.id)) continue;
        seen.add(msg.id);
        merged.push(msg);
        if (merged.length >= max) break;
      }
      if (merged.length >= max) break;
    }

    return { messages: merged, live: true };
  } catch {
    return { messages: [], live: false };
  }
}
