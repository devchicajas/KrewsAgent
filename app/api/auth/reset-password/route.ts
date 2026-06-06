import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserProvisioned } from "@/lib/auth/provision";
import {
  consumePasswordResetToken,
  verifyPasswordResetToken,
} from "@/lib/auth/reset-tokens";
import {
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth/session";
import { DEMO_COOKIE } from "@/lib/auth/types";
import { updateUserPassword } from "@/lib/auth/users";
import { createServiceClient } from "@/lib/supabase/server";
import { checkPublicRateLimit } from "@/lib/security/publicRateLimit";

export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().min(16),
  password: z.string().min(8),
});

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

  const ipLimit = checkPublicRateLimit(`reset-ip:${ip}`, 20, 60 * 60 * 1000);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts — try again later" },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Token and password (8+ chars) required" },
      { status: 400 }
    );
  }

  const verified = await verifyPasswordResetToken(parsed.data.token);
  if (!verified) {
    return NextResponse.json(
      { error: "Invalid or expired reset link — request a new one" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data: userRow } = await supabase
    .from("users")
    .select("id, email, name")
    .eq("id", verified.userId)
    .maybeSingle();

  if (!userRow?.email) {
    return NextResponse.json({ error: "Account not found" }, { status: 400 });
  }

  try {
    await updateUserPassword(verified.userId, parsed.data.password);
    await consumePasswordResetToken(verified.tokenId);

    const user = {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name ?? userRow.email.split("@")[0],
    };
    await ensureUserProvisioned(user);

    const sessionToken = await createSessionToken({
      userId: user.id,
      email: user.email,
    });

    const response = NextResponse.json({ ok: true, email: user.email });
    setSessionCookie(response, sessionToken);
    response.cookies.set(DEMO_COOKIE, "", { maxAge: 0, path: "/" });

    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Reset failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
