import { NextRequest, NextResponse } from "next/server";
import { resolveRequestAuth } from "@/lib/auth/resolveUser";

const OAUTH_UID_COOKIE = "krews_oauth_uid";
import {
  fetchGitHubLogin,
  githubRedirectUri,
  isGitHubConfigured,
  saveGitHubTokens,
} from "@/lib/github/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${appUrl}/connect?github=denied`);
  }

  if (!isGitHubConfigured()) {
    return NextResponse.redirect(`${appUrl}/connect?github=unconfigured`);
  }

  const auth = await resolveRequestAuth(req);
  if (!auth) {
    return NextResponse.redirect(`${appUrl}/login?next=/connect`);
  }

  if (auth.isDemo) {
    return NextResponse.redirect(`${appUrl}/connect?github=demo_only`);
  }

  const stateUserId = req.nextUrl.searchParams.get("state");
  const oauthUid = req.cookies.get(OAUTH_UID_COOKIE)?.value;
  const targetUserId = auth.userId;

  if (stateUserId && stateUserId !== targetUserId) {
    return NextResponse.redirect(`${appUrl}/connect?github=state_mismatch`);
  }
  if (oauthUid && oauthUid !== targetUserId) {
    return NextResponse.redirect(`${appUrl}/connect?github=state_mismatch`);
  }
  if (stateUserId && oauthUid && stateUserId !== oauthUid) {
    return NextResponse.redirect(`${appUrl}/connect?github=state_mismatch`);
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(`${appUrl}/connect?github=missing_code`);
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: githubRedirectUri(),
      }),
    });

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      token_type?: string;
      scope?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[github] token exchange failed:", tokenData);
      return NextResponse.redirect(`${appUrl}/connect?github=error`);
    }

    const github_login = await fetchGitHubLogin(tokenData.access_token);

    const saveUserId = stateUserId ?? targetUserId;
    await saveGitHubTokens(saveUserId, {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      scope: tokenData.scope,
      github_login: github_login ?? undefined,
    });

    const response = NextResponse.redirect(`${appUrl}/connect?github=connected`);
    response.cookies.set(OAUTH_UID_COOKIE, "", { maxAge: 0, path: "/" });
    return response;
  } catch (err) {
    console.error("[github] OAuth callback failed:", err);
    return NextResponse.redirect(`${appUrl}/connect?github=error`);
  }
}
