import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserProvisioned } from "@/lib/auth/provision";
import {
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth/session";
import { DEMO_COOKIE } from "@/lib/auth/types";
import { createUserWithPassword } from "@/lib/auth/users";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(80),
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
      { error: "Name, valid email, and password (8+ chars) required" },
      { status: 400 }
    );
  }

  const { email, password, name } = parsed.data;

  let user;
  try {
    user = await createUserWithPassword(email, password, name);
    await ensureUserProvisioned(user);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sign-up failed";
    if (/password_hash does not exist/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            "Database needs a quick update — paste db/auth-migrations-combined.sql into Supabase SQL Editor and run it, then try again.",
        },
        { status: 503 }
      );
    }
    const status = /already registered/i.test(msg) ? 409 : 400;
    return NextResponse.json({ error: msg }, { status });
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
