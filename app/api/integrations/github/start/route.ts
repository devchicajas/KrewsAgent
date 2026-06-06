import { NextRequest, NextResponse } from "next/server";
import { resolveRequestAuth } from "@/lib/auth/resolveUser";
import { githubRedirectUri, isGitHubConfigured } from "@/lib/github/client";
import { GITHUB_SCOPE_STRING } from "@/lib/github/scopes";

const OAUTH_UID_COOKIE = "krews_oauth_uid";

export const dynamic = "force-dynamic";

/** GitHub OAuth — separate from Gmail; use your GitHub account here. */
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const auth = await resolveRequestAuth(request);

  if (!auth) {
    return NextResponse.redirect(`${appUrl}/login?next=/connect`);
  }

  if (auth.isDemo) {
    return NextResponse.redirect(`${appUrl}/connect?github=demo_only`);
  }

  if (!isGitHubConfigured()) {
    return NextResponse.redirect(`${appUrl}/connect?github=unconfigured`);
  }

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: githubRedirectUri(),
    scope: GITHUB_SCOPE_STRING,
    state: auth.userId,
  });

  const response = NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${params.toString()}`
  );
  response.cookies.set(OAUTH_UID_COOKIE, auth.userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  return response;
}
