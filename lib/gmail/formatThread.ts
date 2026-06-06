type GmailHeaders = Array<{ name?: string | null; value?: string | null }> | undefined;

type GmailPayload = {
  mimeType?: string | null;
  body?: { data?: string | null };
  headers?: GmailHeaders;
  parts?: Array<{
    mimeType?: string | null;
    body?: { data?: string | null };
    parts?: unknown[];
  }>;
} | null | undefined;

export type GmailThreadMessage = {
  id?: string | null;
  internalDate?: string | null;
  snippet?: string | null;
  payload?: GmailPayload;
};

const MAX_THREAD_MESSAGES = 6;
const MAX_PART_CHARS = 1200;
const MAX_THREAD_CHARS = 5000;

export function headerValue(headers: GmailHeaders, name: string): string {
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

export function extractPlainBody(payload: GmailPayload): string {
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

function formatMessageDate(internalDate?: string | null, headers?: GmailHeaders): string {
  const headerDate = headerValue(headers, "Date");
  if (headerDate) return headerDate;
  if (internalDate) {
    const ms = Number(internalDate);
    if (!Number.isNaN(ms)) return new Date(ms).toISOString().slice(0, 16).replace("T", " ");
  }
  return "unknown date";
}

/** Chronological thread text — earlier messages first, latest last */
export function formatThreadBody(messages: GmailThreadMessage[]): string {
  if (messages.length === 0) return "";

  const sorted = [...messages].sort(
    (a, b) => Number(a.internalDate ?? 0) - Number(b.internalDate ?? 0)
  );

  if (sorted.length === 1) {
    const only = sorted[0];
    const body =
      extractPlainBody(only.payload) || only.snippet || "";
    return body.slice(0, MAX_THREAD_CHARS);
  }

  const slice = sorted.slice(-MAX_THREAD_MESSAGES);
  const omitted = sorted.length - slice.length;

  const parts = slice.map((msg, idx) => {
    const isLatest = idx === slice.length - 1;
    const headers = msg.payload?.headers;
    const from = headerValue(headers, "From") || "unknown sender";
    const date = formatMessageDate(msg.internalDate, headers);
    const body = extractPlainBody(msg.payload) || msg.snippet || "";
    const label = isLatest ? "Latest" : "Earlier";
    return `--- ${label} · ${from} · ${date} ---\n${body.slice(0, MAX_PART_CHARS)}`;
  });

  const intro = `Email thread (${sorted.length} messages${
    omitted ? `, showing last ${slice.length}` : ""
  }):`;
  return `${intro}\n\n${parts.join("\n\n")}`.slice(0, MAX_THREAD_CHARS);
}
