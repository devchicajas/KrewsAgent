import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
import { DEMO_COOKIE } from "@/lib/auth/types";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  response.cookies.set(DEMO_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}
