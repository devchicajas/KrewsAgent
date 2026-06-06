import { getAuthorizedGmailClient } from "./client";
import { buildGmailRawMessage, type EmailPayload } from "./buildMessage";

export async function trySendGmailMessage(
  userId: string,
  payload: EmailPayload,
  body: string
): Promise<{ sent: boolean; messageId?: string; reason?: string }> {
  const gmail = await getAuthorizedGmailClient(userId);
  if (!gmail) {
    return { sent: false, reason: "gmail_not_connected" };
  }

  const raw = buildGmailRawMessage(payload, body);
  if (!raw) {
    return { sent: false, reason: "missing_recipient" };
  }

  try {
    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw,
        ...(payload.threadId ? { threadId: payload.threadId } : {}),
      },
    });
    return { sent: true, messageId: res.data.id ?? undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "gmail_api_error";
    return { sent: false, reason: msg };
  }
}
