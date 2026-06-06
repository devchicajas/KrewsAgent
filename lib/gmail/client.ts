import { google } from "googleapis";
import { createServiceClient } from "@/lib/supabase/server";

export interface GmailTokens {
  access_token?: string;
  refresh_token?: string;
  expiry_date?: number;
}

function isRealEnvValue(value: string | undefined, placeholder: string): boolean {
  return !!value && value.trim() !== "" && value !== placeholder;
}

export function isGmailConfigured(): boolean {
  return (
    isRealEnvValue(process.env.GOOGLE_CLIENT_ID, "your_google_client_id_here") &&
    isRealEnvValue(process.env.GOOGLE_CLIENT_SECRET, "your_google_client_secret_here")
  );
}

export function gmailRedirectUri(): string {
  return (
    process.env.GOOGLE_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/gmail/callback`
  );
}

export async function getGmailTokens(userId: string): Promise<GmailTokens | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("integrations")
    .select("connected, payload")
    .eq("user_id", userId)
    .eq("provider", "gmail")
    .maybeSingle();

  if (!data?.connected) return null;
  const payload = (data.payload ?? {}) as GmailTokens;
  if (!payload.refresh_token && !payload.access_token) return null;
  return payload;
}

export async function saveGmailTokens(
  userId: string,
  tokens: GmailTokens
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("integrations").upsert(
    {
      user_id: userId,
      provider: "gmail",
      connected: true,
      connected_at: new Date().toISOString(),
      payload: tokens,
    },
    { onConflict: "user_id,provider" }
  );
  if (error) throw new Error(error.message);
}

export async function getAuthorizedGmailClient(userId: string) {
  if (!isGmailConfigured()) return null;

  const tokens = await getGmailTokens(userId);
  if (!tokens) return null;

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    gmailRedirectUri()
  );

  oauth2.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
  });

  oauth2.on("tokens", async (fresh) => {
    await saveGmailTokens(userId, {
      ...tokens,
      access_token: fresh.access_token ?? tokens.access_token,
      refresh_token: fresh.refresh_token ?? tokens.refresh_token,
      expiry_date: fresh.expiry_date ?? tokens.expiry_date,
    });
  });

  return google.gmail({ version: "v1", auth: oauth2 });
}
