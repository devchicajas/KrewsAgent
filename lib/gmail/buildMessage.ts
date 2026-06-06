export interface EmailPayload {
  to?: string;
  subject?: string;
}

export function extractEmailAddress(value: string): string {
  const trimmed = value.trim();
  const angle = trimmed.match(/<([^>]+)>/);
  if (angle) return angle[1].trim().toLowerCase();
  const email = trimmed.match(/[\w.+-]+@[\w.-]+\.\w+/);
  return email ? email[0].toLowerCase() : trimmed;
}

/** Strip leading To/Subject/etc. lines TARS often puts inside preview text */
export function parseLeadingEmailHeaders(text: string): {
  body: string;
  to?: string;
  subject?: string;
} {
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  let to: string | undefined;
  let subject: string | undefined;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      i++;
      break;
    }

    const toMatch = trimmed.match(/^to:\s*(.+)$/i);
    const subjectMatch = trimmed.match(/^subject:\s*(.+)$/i);
    const skipMatch = trimmed.match(/^(from|cc|bcc|mime-version|content-type):/i);

    if (toMatch) {
      to = extractEmailAddress(toMatch[1]);
      i++;
      continue;
    }
    if (subjectMatch) {
      subject = subjectMatch[1].trim();
      i++;
      continue;
    }
    if (skipMatch) {
      i++;
      continue;
    }
    break;
  }

  const body = lines.slice(i).join("\n").trim();
  return { body: body || text.trim(), to, subject };
}

export function prepareOutboundEmail(
  payload: EmailPayload,
  preview: string
): { payload: EmailPayload; body: string } | null {
  const parsed = parseLeadingEmailHeaders(preview);
  const to = payload.to?.trim()
    ? extractEmailAddress(payload.to)
    : parsed.to;
  const subject = payload.subject?.trim() || parsed.subject || "Re: your message";

  if (!to) return null;

  return {
    payload: { to, subject },
    body: parsed.body,
  };
}

export function buildGmailRawMessage(payload: EmailPayload, body: string): string | null {
  const prepared = prepareOutboundEmail(payload, body);
  if (!prepared) return null;

  const { payload: resolved, body: cleanBody } = prepared;
  const to = resolved.to!.trim();
  const subject = resolved.subject?.trim() ?? "KrewsAgent draft";

  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    cleanBody,
  ].join("\r\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
