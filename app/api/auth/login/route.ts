import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserProvisioned } from "@/lib/auth/provision";
import {
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth/session";
import { DEMO_COOKIE } from "@/lib/auth/types";
import { userNeedsPasswordSetup, verifyUserCredentials } from "@/lib/auth/users";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Email and password (8+ chars) required" },
      { status: 400 }
    );
  }

  if (await userNeedsPasswordSetup(parsed.data.email)) {
    return NextResponse.json(
      {
        error:
          "No password set for this email yet — use Create Account with the same email, or Forgot password.",
      },
      { status: 401 }
    );
  }

  const user = await verifyUserCredentials(parsed.data.email, parsed.data.password);
  if (!user) {
    return NextResponse.json(
      { error: "Wrong email or password" },
      { status: 401 }
    );
  }

  try {
    await ensureUserProvisioned(user);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Account setup failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
  });

  const response = NextResponse.json({
    ok: true,
    email: user.email,
  });
  setSessionCookie(response, token);
  response.cookies.set(DEMO_COOKIE, "", { maxAge: 0, path: "/" });

  return response;
}
