import { NextRequest, NextResponse } from "next/server";
import { resolveRequestAuth } from "@/lib/auth/resolveUser";
import { GMAIL_SCOPE_STRING } from "@/lib/gmail/scopes";
import { gmailRedirectUri, isGmailConfigured } from "@/lib/gmail/client";

export const dynamic = "force-dynamic";

/** Gmail OAuth — requires signed-in user (or demo session). */
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const auth = await resolveRequestAuth(request);

  if (!auth) {
    return NextResponse.redirect(`${appUrl}/login?next=/connect`);
  }

  if (auth.isDemo) {
    return NextResponse.redirect(`${appUrl}/connect?gmail=demo_only`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = gmailRedirectUri();

  if (!isGmailConfigured()) {
    return NextResponse.redirect(`${appUrl}/connect?gmail=unconfigured`);
  }

  const params = new URLSearchParams({
    client_id: clientId!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPE_STRING,
    access_type: "offline",
    prompt: "consent",
    state: auth.userId,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
