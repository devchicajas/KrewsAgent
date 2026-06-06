import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
import { DEMO_COOKIE } from "@/lib/auth/types";
import { seedDemoUser, STABLE_DEMO_ID } from "@/lib/demo/seedCore";

export const dynamic = "force-dynamic";

/** Start anonymous demo session (shared demo user). */
export async function GET(request: Request) {
  const userId = process.env.DEMO_USER_ID || STABLE_DEMO_ID;

  try {
    await seedDemoUser(userId);
  } catch {
    // continue — demo may already be seeded
  }

  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") ?? "/connect";

  const response = NextResponse.redirect(`${origin}${next}`);
  clearSessionCookie(response);
  response.cookies.set(DEMO_COOKIE, "1", {
    path: "/",
    maxAge: 60 * 60 * 24,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
