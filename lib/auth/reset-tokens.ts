import { createHash, randomBytes } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";

const TOKEN_BYTES = 32;
const EXPIRY_HOURS = 1;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateResetToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export async function createPasswordResetToken(
  userId: string
): Promise<string> {
  const supabase = createServiceClient();
  const rawToken = generateResetToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000);

  await supabase
    .from("password_reset_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("used_at", null);

  const { error } = await supabase.from("password_reset_tokens").insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw new Error(`password_reset_tokens insert failed: ${error.message}`);
  }

  return rawToken;
}

export async function verifyPasswordResetToken(
  rawToken: string
): Promise<{ userId: string; tokenId: string } | null> {
  const supabase = createServiceClient();
  const tokenHash = hashToken(rawToken);

  const { data, error } = await supabase
    .from("password_reset_tokens")
    .select("id, user_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data || data.used_at) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;

  return { userId: data.user_id, tokenId: data.id };
}

export async function consumePasswordResetToken(tokenId: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("password_reset_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", tokenId);
}
