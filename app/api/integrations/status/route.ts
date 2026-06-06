import { NextResponse } from "next/server";
import { withSecurity } from "@/lib/security/middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchOpenIssues } from "@/lib/github/fetchIssues";
import {
  getGitHubIntegration,
  getGitHubRepoTarget,
  isGitHubConfigured,
  isGitHubRowConnected,
  parseGitHubPayload,
} from "@/lib/github/client";
import { isGmailConfigured } from "@/lib/gmail/client";

export const dynamic = "force-dynamic";

export const GET = withSecurity(
  async (_req, _body, auth) => {
    const userId = auth.userId;
    const supabase = createServiceClient();

    const { data: userRow } = await supabase
      .from("users")
      .select("email")
      .eq("id", userId)
      .maybeSingle();

    const { data: integrations } = await supabase
      .from("integrations")
      .select("provider, connected, payload")
      .eq("user_id", userId);

    const map = Object.fromEntries(
      (integrations ?? []).map((i) => [i.provider, i])
    );

    const gmailConfigured = isGmailConfigured();
    const gmailConnected =
      !auth.isDemo && !!map.gmail?.connected && gmailConfigured;

    const githubConfigured = isGitHubConfigured();
    const githubRow = map.github;
    const githubIntegration = auth.isDemo
      ? null
      : (parseGitHubPayload(githubRow?.payload) ??
        (await getGitHubIntegration(userId)));
    const githubOAuthConnected =
      !auth.isDemo &&
      (isGitHubRowConnected(githubRow) || !!githubIntegration?.access_token);

    const { owner, repo, selected_by_user } = auth.isDemo
      ? { owner: "demo", repo: "fixtures", selected_by_user: false }
      : await getGitHubRepoTarget(userId);
    const { live: githubLive } = auth.isDemo
      ? { live: false }
      : await fetchOpenIssues(userId);

    return NextResponse.json({
      is_demo: auth.isDemo,
      demo_mode: auth.isDemo,
      placeholder_account: auth.isDemo,
      account_email: auth.isDemo ? null : (userRow?.email ?? auth.email ?? null),
      gmail: {
        connected: gmailConnected,
        simulated: !gmailConnected,
        configured: gmailConfigured,
        live_inbox: gmailConnected,
      },
      github: {
        connected: githubOAuthConnected,
        simulated: !githubOAuthConnected,
        live: githubLive,
        read_only: !githubOAuthConnected,
        configured: githubConfigured,
        owner,
        repo,
        repo_url: `https://github.com/${owner}/${repo}`,
        repo_selected: selected_by_user,
        github_login: auth.isDemo
          ? null
          : (githubIntegration?.github_login ?? null),
        can_comment_on_approve: githubOAuthConnected && selected_by_user,
      },
      slack: {
        connected: false,
        coming_soon: true,
      },
      onboarding_complete: gmailConnected || githubOAuthConnected || auth.isDemo,
    });
  },
  { method: "GET", skipBody: true }
);
