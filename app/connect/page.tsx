"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { WindowChrome } from "@/components/WindowChrome";
import { PrivacyDisclaimer } from "@/components/PrivacyDisclaimer";
import { AccountModeBadge } from "@/components/AccountModeBadge";
import { GitHubRepoPicker } from "@/components/GitHubRepoPicker";
import { githubRetentionNote, gmailRetentionNote } from "@/lib/privacy/retention";

interface IntegrationStatus {
  is_demo?: boolean;
  placeholder_account?: boolean;
  account_email?: string | null;
  demo_mode: boolean;
  gmail: { connected: boolean; simulated: boolean; configured: boolean };
  github: {
    connected: boolean;
    simulated: boolean;
    read_only: boolean;
    configured?: boolean;
    live?: boolean;
    owner?: string;
    repo?: string;
    repo_url?: string;
    repo_selected?: boolean;
    github_login?: string | null;
    can_comment_on_approve?: boolean;
  };
  slack: { connected: boolean; coming_soon: boolean };
}

const GMAIL_STATUS_MSG: Record<string, string> = {
  connected: "Gmail connected — approving email drafts can create inbox drafts.",
  state_mismatch: "Gmail session mismatch — sign in again and retry connect.",
  denied: "Gmail authorization was cancelled.",
  unconfigured: "Gmail OAuth is not configured on this deployment.",
  demo_only:
    "Demo is placeholder-only — create a real account to connect your Gmail.",
  error: "Gmail connection failed — check OAuth redirect URI and try again.",
  missing_code: "Gmail callback missing authorization code.",
  no_tokens: "Gmail did not return tokens — try connecting again with consent.",
};

const GITHUB_STATUS_MSG: Record<string, string> = {
  connected: "GitHub authorized — choose your repo below if you have not already.",
  state_mismatch: "GitHub session mismatch — sign in again and retry connect.",
  denied: "GitHub authorization was cancelled.",
  unconfigured: "GitHub OAuth is not configured — add GITHUB_CLIENT_ID/SECRET.",
  error: "GitHub connection failed — check OAuth callback URL and try again.",
  missing_code: "GitHub callback missing authorization code.",
  demo_only:
    "Demo is placeholder-only — create a real account to connect your GitHub.",
};

function ConnectPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gmailParam = searchParams.get("gmail");
  const githubParam = searchParams.get("github");

  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [statusError, setStatusError] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  const refreshAndLoadStatus = useCallback(async () => {
    try {
      await fetch("/api/auth/refresh", { credentials: "include" });
    } catch {
      // continue — status may still work
    }

    try {
      const statusRes = await fetch("/api/integrations/status", {
        credentials: "include",
      });
      const d = await statusRes.json().catch(() => ({}));

      if (statusRes.status === 401) {
        setStatus(null);
        setStatusError(true);
        return;
      }
      if (!statusRes.ok) {
        setStatus(null);
        setStatusError(true);
        setOauthNotice(
          typeof d.error === "string"
            ? d.error
            : "Could not load connection status — refresh or sign in again."
        );
        return;
      }

      setStatus(d);
      setStatusError(false);

      const ghParam = searchParams.get("github");
      const gmParam = searchParams.get("gmail");

      if (d.github?.connected) {
        setOauthNotice(
          "GitHub connected — choose your repo below if you have not already."
        );
      } else if (ghParam === "connected") {
        setOauthNotice(
          "GitHub authorized in browser but this login is not linked — sign out, sign in again, then click Connect GitHub once more."
        );
      } else if (gmParam && GMAIL_STATUS_MSG[gmParam]) {
        setOauthNotice(GMAIL_STATUS_MSG[gmParam]);
      } else if (ghParam && GITHUB_STATUS_MSG[ghParam]) {
        setOauthNotice(GITHUB_STATUS_MSG[ghParam]);
      }
    } catch {
      setStatusError(true);
      setOauthNotice(
        "Could not reach the server — check that npm run dev is running."
      );
    } finally {
      setStatusLoaded(true);
    }
  }, [githubParam, gmailParam]);

  useEffect(() => {
    let cancelled = false;
    const hasOauthParam = !!(gmailParam || githubParam);

    refreshAndLoadStatus().then(() => {
      if (cancelled || !hasOauthParam) return;
      window.setTimeout(() => router.replace("/connect"), 1500);
    });

    return () => {
      cancelled = true;
    };
  }, [gmailParam, githubParam, refreshAndLoadStatus, router]);

  const handleSkipDemo = () => {
    window.location.href = "/api/auth/demo?next=/dashboard";
  };

  const demoMode = skipped || (status?.demo_mode ?? true);
  const gmailConnected = !!status?.gmail.connected;
  const gmailConfigured = !!status?.gmail.configured;
  const isPlaceholderDemo = !!(status?.is_demo || status?.placeholder_account);
  const showGmailConnect =
    gmailConfigured && !gmailConnected && !isPlaceholderDemo;
  const gmailUsesDemoInbox = !gmailConnected;

  const githubConnected = !!status?.github.connected;
  const githubConfigured = !!status?.github.configured;
  const showGitHubConnect =
    githubConfigured && !githubConnected && !isPlaceholderDemo;
  const githubRepoSelected = !!status?.github.repo_selected;

  const githubOAuthMismatch =
    statusLoaded &&
    !githubConnected &&
    !statusError &&
    githubParam === "connected" &&
    !oauthNotice?.includes("not linked");

  return (
    <WindowChrome title="KREWSAGENT.EXE — Setup Wizard">
      <h1 className="page-h">{">>"} CONNECT YOUR STACK</h1>
      <p className="page-s max-w-2xl">
        Gmail and GitHub are <strong>separate OAuth flows</strong> — use your
        Gmail Google account for inbox, and your GitHub account for issues. Your
        KrewsAgent login email can be different from both.
      </p>

      <AccountModeBadge variant="banner" />

      {statusLoaded && !statusError && isPlaceholderDemo && (
        <p className="text-base mb-4 badge-strawberry">
          [ Placeholder demo — fictional founder &quot;Jordan&quot;, simulated
          inbox/issues.{" "}
          <Link href="/login?tab=signup" className="underline">
            Create your account
          </Link>{" "}
          to connect real Gmail/GitHub. ]
        </p>
      )}

      {statusLoaded && !statusError && status?.account_email && (
        <p className="text-base mb-2 text-matcha-bright">
          Signed in as <strong>{status.account_email}</strong>
          {githubConnected ? " · GitHub linked" : " · GitHub not linked yet"}
        </p>
      )}

      {statusLoaded && !statusError && !isPlaceholderDemo && (
        <ol className="text-base mb-4 space-y-1 list-decimal list-inside text-strawberry-light">
          <li>Stay signed in as your account above (not a different tab/user).</li>
          <li>
            Click <strong>CONNECT GITHUB</strong> — authorize on GitHub.
          </li>
          <li>
            Pick your repo below → <strong>SAVE REPO CHOICE</strong>.
          </li>
        </ol>
      )}

      {oauthNotice && (
        <p
          className={`text-base mb-4 ${
            (gmailParam === "connected" || githubParam === "connected" || githubConnected) &&
            !oauthNotice.includes("not linked")
              ? "badge-matcha"
              : "badge-strawberry"
          }`}
        >
          [ {oauthNotice} ]
          {githubParam === "demo_only" && !isPlaceholderDemo && (
            <>
              {" "}
              You look signed in — try{" "}
              <button
                type="button"
                className="underline"
                onClick={() => {
                  window.location.href = "/login?next=/connect&tab=signin";
                }}
              >
                signing in again
              </button>{" "}
              to refresh your session.
            </>
          )}
        </p>
      )}

      {githubOAuthMismatch && (
        <p className="text-base mb-4 badge-strawberry">
          [ GitHub authorized in browser but this session is not linked — sign in
          (same account) and click Connect GitHub again. ]
        </p>
      )}

      {statusError && (
        <p className="text-strawberry text-base mb-4">
          [ ⚠ Sign in to see your connection status —{" "}
          <Link href="/login?next=/connect" className="underline">
            log in
          </Link>{" "}
          ]
        </p>
      )}

      <div className="card mb-4 space-y-3">
        <div className="panel-inset flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="card-title mb-0">♦ GMAIL</span>
              <span
                className={
                  gmailConnected
                    ? "badge-matcha"
                    : gmailUsesDemoInbox
                      ? "badge-strawberry"
                      : "badge-dim"
                }
              >
                {gmailConnected
                  ? "✓ LIVE INBOX + DRAFTS"
                  : gmailUsesDemoInbox
                    ? demoMode
                      ? "DEMO INBOX — SIMULATED"
                      : "NOT CONNECTED"
                    : "NOT CONNECTED"}
              </span>
            </div>
            <p className="card-desc">
              {isPlaceholderDemo
                ? "Demo uses a simulated inbox only — no real Gmail in placeholder mode."
                : "Connect with your Google/Gmail account for Ops crew inbox triage · Approve to draft or send email"}
            </p>
            <p className="privacy-retention-note">
              {gmailRetentionNote(!gmailConnected, gmailConnected)}
            </p>
            {!gmailConfigured && (
              <p className="text-strawberry-light text-base mt-1">
                Add GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET — see
                docs/INTEGRATIONS_SETUP.md
              </p>
            )}
          </div>
          {showGmailConnect && (
            <a
              href="/api/integrations/gmail/start"
              className="btn-secondary flex-shrink-0 text-center no-underline"
            >
              [ CONNECT GMAIL ]
            </a>
          )}
        </div>

        <div className="panel-inset flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="card-title mb-0">♦ GITHUB</span>
              <span className={githubConnected ? "badge-matcha" : "badge-strawberry"}>
                {githubConnected
                  ? `✓ CONNECTED${status?.github.github_login ? ` (@${status.github.github_login})` : ""}`
                  : "NOT CONNECTED"}
              </span>
              {githubConnected && !githubRepoSelected && (
                <span className="badge-strawberry">PICK A REPO</span>
              )}
              {githubConnected && githubRepoSelected && (
                <span className="badge-matcha">REPO SET</span>
              )}
            </div>
            <p className="card-desc">
              {isPlaceholderDemo
                ? "Demo uses sample GitHub issues only — sign up to connect your repos."
                : "Connect with your GitHub account (can differ from Gmail) · Support crew reads issues · Approving replies posts comments on your chosen repo"}
            </p>
            <p className="privacy-retention-note">
              {githubRetentionNote(!githubConnected)}
            </p>
            {githubConnected && status?.github.github_login && (
              <p className="text-matcha-bright text-base mt-1">
                GitHub account: @{status.github.github_login}
              </p>
            )}
            {githubConnected && githubRepoSelected && status?.github.repo_url && (
              <p className="text-base mt-1">
                Your repo:{" "}
                <a
                  href={status.github.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {status.github.owner}/{status.github.repo}
                </a>
              </p>
            )}
            {githubConfigured && (
              <GitHubRepoPicker
                enabled={githubConnected}
                currentOwner={status?.github.owner}
                currentRepo={status?.github.repo}
                repoSelected={status?.github.repo_selected}
                onSaved={refreshAndLoadStatus}
              />
            )}
            {!githubConfigured && (
              <p className="text-strawberry-light text-base mt-1">
                Add GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET — see
                docs/INTEGRATIONS_SETUP.md
              </p>
            )}
          </div>
          {showGitHubConnect && (
            <a
              href="/api/integrations/github/start"
              className="btn-secondary flex-shrink-0 text-center no-underline"
            >
              [ CONNECT GITHUB ]
            </a>
          )}
        </div>

        <div className="panel-inset flex flex-col sm:flex-row sm:items-center justify-between gap-3 opacity-60">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="card-title mb-0">♦ SLACK</span>
              <span className="badge-dim">COMING IN MVP 2</span>
            </div>
            <p className="card-desc">Team notifications and channel summaries</p>
          </div>
          <button type="button" className="btn-retro flex-shrink-0" disabled>
            [ COMING IN MVP 2 ]
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Link href="/login?tab=signup" className="btn-primary text-center">
          {status?.is_demo
            ? "[ CREATE REAL ACCOUNT → ]"
            : "[ SIGN IN / CREATE ACCOUNT ]"}
        </Link>
        <button type="button" className="btn-secondary" onClick={handleSkipDemo}>
          [ {status?.is_demo ? "CONTINUE DEMO" : "TRY DEMO INSTEAD"} ]
        </button>
        <Link href="/dashboard" className="btn-retro text-center">
          [ GO TO DASHBOARD → ]
        </Link>
      </div>

      <PrivacyDisclaimer className="border-t border-strawberry-dark pt-4" />
    </WindowChrome>
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={<WindowChrome title="KREWSAGENT.EXE — Setup Wizard">Loading…</WindowChrome>}>
      <ConnectPageInner />
    </Suspense>
  );
}
