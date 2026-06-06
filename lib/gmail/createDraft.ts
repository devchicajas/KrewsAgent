import { getAuthorizedGmailClient } from "./client";
import { buildGmailRawMessage, type EmailPayload } from "./buildMessage";

export type DraftEmailPayload = EmailPayload;

export async function tryCreateGmailDraft(
  userId: string,
  payload: DraftEmailPayload,
  body: string
): Promise<{ created: boolean; draftId?: string; reason?: string }> {
  const gmail = await getAuthorizedGmailClient(userId);
  if (!gmail) {
    return { created: false, reason: "gmail_not_connected" };
  }

  const raw = buildGmailRawMessage(payload, body);
  if (!raw) {
    return { created: false, reason: "missing_recipient" };
  }

  try {
    const res = await gmail.users.drafts.create({
      userId: "me",
      requestBody: {
        message: {
          raw,
          ...(payload.threadId ? { threadId: payload.threadId } : {}),
        },
      },
    });
    return { created: true, draftId: res.data.id ?? undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "gmail_api_error";
    return { created: false, reason: msg };
  }
}
