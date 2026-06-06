import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE } from "@/lib/auth/types";
import { reconcileSession } from "@/lib/auth/reconcileSession";
import {
  SESSION_COOKIE,
  clearSessionCookie,
  createSessionToken,
  setSessionCookie,
  verifySessionToken,
} from "@/lib/auth/session";

const PROTECTED = ["/dashboard", "/activity", "/connect"];

export async function middleware(request: NextRequest) {
  const host = request.nextUrl.hostname;
  if (host === "127.0.0.1") {
    const url = request.nextUrl.clone();
    url.hostname = "localhost";
    return NextResponse.redirect(url);
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  const rawSession = sessionToken
    ? await verifySessionToken(sessionToken)
    : null;
  const session = rawSession ? await reconcileSession(rawSession) : null;

  const isDemo = request.cookies.get(DEMO_COOKIE)?.value === "1";
  const path = request.nextUrl.pathname;

  if (rawSession && !session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", path);
    login.searchParams.set("error", "session_expired");
    const response = NextResponse.redirect(login);
    clearSessionCookie(response);
    response.cookies.set(DEMO_COOKIE, "", { maxAge: 0, path: "/" });
    return response;
  }

  if (PROTECTED.some((p) => path.startsWith(p)) && !session && !isDemo) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  if (path === "/login" && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const response = NextResponse.next();

  // Real login wins — drop stale demo cookie so OAuth routes see your account
  if (session && isDemo) {
    response.cookies.set(DEMO_COOKIE, "", { maxAge: 0, path: "/" });
  }

  // Refresh JWT when DB user id changed (account reset + new sign-up, same email)
  if (session && rawSession && session.userId !== rawSession.userId) {
    const token = await createSessionToken(session);
    setSessionCookie(response, token);
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/activity/:path*",
    "/connect/:path*",
    "/login",
    "/signup",
  ],
};
