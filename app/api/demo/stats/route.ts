import { NextResponse } from "next/server";
import { withSecurity } from "@/lib/security/middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { DEMO_FOUNDER_NAME } from "@/lib/demo/seedCore";
import { isDemoMode } from "@/lib/env";
import { fetchOpenIssues } from "@/lib/github/fetchIssues";
import { describeRawRetention } from "@/lib/privacy/retention";
import { isGmailConfigured } from "@/lib/gmail/client";
import { isGitHubConnected } from "@/lib/github/client";

export const dynamic = "force-dynamic";

/** Verifiable privacy + security stats for the dashboard bar */
export const GET = withSecurity(
  async (_req, _body, auth) => {
    const userId = auth.userId;
    const supabase = createServiceClient();

    const { count: executedWithoutApproval } = await supabase
      .from("action_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action", "executed_without_approval");

    const { count: pending } = await supabase
      .from("approvals")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pending");

    const { count: approvalsStored } = await supabase
      .from("approvals")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    const { data: founder } = await supabase
      .from("founder_context")
      .select("founder_name")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: integrations } = await supabase
      .from("integrations")
      .select("provider, connected")
      .eq("user_id", userId);

    const map = Object.fromEntries(
      (integrations ?? []).map((i) => [i.provider, i.connected])
    );

    const gmailConfigured = isGmailConfigured();
    const gmailConnected = !!map.gmail && gmailConfigured;
    const gmailSimulated = !gmailConnected;

    const githubOAuthConnected = await isGitHubConnected(userId);
    const { live: githubLive } = await fetchOpenIssues(userId);

    const retentionState = {
      demo_mode: auth.isDemo || isDemoMode(),
      gmail: { connected: gmailConnected, simulated: gmailSimulated },
      github: { connected: githubOAuthConnected, simulated: !githubOAuthConnected },
    };

    const tarsKey = process.env.TARS_API_KEY;
    const tarsConfigured =
      !!tarsKey && tarsKey !== "demo" && !tarsKey.startsWith("your_");

    return NextResponse.json({
      actions_executed_without_approval: executedWithoutApproval ?? 0,
      pending: pending ?? 0,
      founder_name: auth.isDemo
        ? DEMO_FOUNDER_NAME
        : (founder?.founder_name ?? "Jordan"),
      is_demo: auth.isDemo,
      privacy: {
        training_pipeline: false,
        raw_inbox_stored: false,
        approvals_stored: approvalsStored ?? 0,
        audit_log_redacted: true,
        demo_mode: auth.isDemo || isDemoMode(),
        tars_configured: tarsConfigured,
        integrations: retentionState,
        retention_lines: describeRawRetention(retentionState),
      },
    });
  },
  { method: "GET", skipBody: true }
);
