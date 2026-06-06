import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { resolveRequestAuth } from "@/lib/auth/resolveUser";
import {
  gmailRedirectUri,
  isGmailConfigured,
  saveGmailTokens,
} from "@/lib/gmail/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${appUrl}/connect?gmail=denied`);
  }

  if (!isGmailConfigured()) {
    return NextResponse.redirect(`${appUrl}/connect?gmail=unconfigured`);
  }

  const auth = await resolveRequestAuth(req);
  if (!auth) {
    return NextResponse.redirect(`${appUrl}/login?next=/connect`);
  }

  if (auth.isDemo) {
    return NextResponse.redirect(`${appUrl}/connect?gmail=demo_only`);
  }

  const stateUserId = req.nextUrl.searchParams.get("state");
  if (stateUserId && stateUserId !== auth.userId) {
    return NextResponse.redirect(`${appUrl}/connect?gmail=state_mismatch`);
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(`${appUrl}/connect?gmail=missing_code`);
  }

  try {
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      gmailRedirectUri()
    );

    const { tokens } = await oauth2.getToken(code);
    if (!tokens.refresh_token && !tokens.access_token) {
      return NextResponse.redirect(`${appUrl}/connect?gmail=no_tokens`);
    }

    await saveGmailTokens(auth.userId, {
      access_token: tokens.access_token ?? undefined,
      refresh_token: tokens.refresh_token ?? undefined,
      expiry_date: tokens.expiry_date ?? undefined,
    });

    return NextResponse.redirect(`${appUrl}/connect?gmail=connected`);
  } catch (err) {
    console.error("[gmail] OAuth callback failed:", err);
    return NextResponse.redirect(`${appUrl}/connect?gmail=error`);
  }
}
