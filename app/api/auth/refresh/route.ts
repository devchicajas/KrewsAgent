import { NextRequest, NextResponse } from "next/server";
import { reconcileSession } from "@/lib/auth/reconcileSession";
import {
  clearSessionCookie,
  createSessionToken,
  getSessionFromCookies,
  setSessionCookie,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Rebind stale JWT to current DB user (e.g. after account:reset + re-signup). */
export async function GET(request: NextRequest) {
  const raw = await getSessionFromCookies(request);
  if (!raw) {
    return NextResponse.json({ ok: false, reason: "no_session" }, { status: 401 });
  }

  const session = await reconcileSession(raw);
  if (!session) {
    const response = NextResponse.json(
      { ok: false, reason: "invalid_session" },
      { status: 401 }
    );
    clearSessionCookie(response);
    return response;
  }

  const response = NextResponse.json({
    ok: true,
    user_id: session.userId,
    email: session.email,
    refreshed: session.userId !== raw.userId,
  });

  if (session.userId !== raw.userId) {
    const token = await createSessionToken(session);
    setSessionCookie(response, token);
  }

  return response;
}
