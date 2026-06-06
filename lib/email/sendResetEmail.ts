import { Resend } from "resend";

const GENERIC_SUCCESS =
  "If that email has a password account, we sent a reset link. Check your inbox.";

const FALLBACK_MESSAGE =
  "Resend test mode only emails your Resend signup address. Use the reset link below, or verify a domain at resend.com/domains for any recipient.";

export function forgotPasswordSuccessMessage(): string {
  return GENERIC_SUCCESS;
}

export function forgotPasswordFallbackMessage(): string {
  return FALLBACK_MESSAGE;
}

function isResendTestModeRestriction(message: string): boolean {
  return /only send testing emails to your own email/i.test(message);
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
): Promise<{ sent: boolean; devLink?: string; fallback?: boolean }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.AUTH_EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    console.info("[auth] Password reset link (dev — set RESEND_API_KEY to email):");
    console.info(resetUrl);
    return { sent: false, devLink: resetUrl };
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: "Reset your KrewsAgent password",
    html: `
      <p>You asked to reset your KrewsAgent password.</p>
      <p><a href="${resetUrl}">Reset password</a></p>
      <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
    `,
    text: `Reset your KrewsAgent password: ${resetUrl}\n\nExpires in 1 hour.`,
  });

  if (error) {
    console.error("[auth] Resend failed:", error.message);
    if (isResendTestModeRestriction(error.message)) {
      console.info("[auth] Falling back to on-screen reset link:", resetUrl);
      return { sent: false, devLink: resetUrl, fallback: true };
    }
    throw new Error("Could not send reset email — try again later");
  }

  return { sent: true };
}
