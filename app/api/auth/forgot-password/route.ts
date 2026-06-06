import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPasswordResetToken } from "@/lib/auth/reset-tokens";
import { findAccountByEmailForReset } from "@/lib/auth/users";
import {
  forgotPasswordFallbackMessage,
  forgotPasswordSuccessMessage,
  sendPasswordResetEmail,
} from "@/lib/email/sendResetEmail";
import { checkPublicRateLimit } from "@/lib/security/publicRateLimit";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
});

const SUCCESS = { ok: true, message: forgotPasswordSuccessMessage() };

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (origin && origin !== appUrl && !origin.includes("localhost")) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const ipLimit = checkPublicRateLimit(
    `forgot-ip:${ip}`,
    10,
    60 * 60 * 1000
  );
  if (!ipLimit.allowed) {
    return NextResponse.json(SUCCESS);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const emailLimit = checkPublicRateLimit(
    `forgot-email:${email}`,
    3,
    60 * 60 * 1000
  );
  if (!emailLimit.allowed) {
    return NextResponse.json(SUCCESS);
  }

  const user = await findAccountByEmailForReset(email);
  if (!user) {
    return NextResponse.json(SUCCESS);
  }

  try {
    const token = await createPasswordResetToken(user.id);
    const resetUrl = `${appUrl}/login/reset?token=${encodeURIComponent(token)}`;
    const result = await sendPasswordResetEmail(user.email, resetUrl);

    return NextResponse.json({
      ok: true,
      message: result.fallback
        ? forgotPasswordFallbackMessage()
        : forgotPasswordSuccessMessage(),
      dev_reset_url: result.devLink,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Request failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
