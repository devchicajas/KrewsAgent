"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AccountModeBadge } from "@/components/AccountModeBadge";
import { WindowChrome } from "@/components/WindowChrome";
import { ApprovalCard, type ApprovalRow } from "@/components/ApprovalCard";
import { DEFAULT_GROWTH_SHIPPED } from "@/lib/demo/growthDefaults";
import { PrivacyDisclaimer } from "@/components/PrivacyDisclaimer";

type CrewType = "ops" | "growth" | "support" | "finance";
type RunState = "idle" | "running" | "success" | "error" | "rate_limited";

const CREWS: { id: CrewType; label: string; status: string; borderClass: string }[] = [
  { id: "ops", label: "OPS", status: "Active", borderClass: "crew-btn-ops" },
  { id: "growth", label: "GROWTH", status: "Ready", borderClass: "crew-btn-growth" },
  { id: "support", label: "SUPPORT", status: "Ready", borderClass: "crew-btn-support" },
  {
    id: "finance",
    label: "FINANCE",
    status: "Read-only",
    borderClass: "crew-btn-finance",
  },
];

const PIPELINE_STAGES = [
  "Reading founder context",
  "Reviewing inbox and GitHub",
  "Classifying priority items",
  "Evaluating risk level",
  "Drafting through TARS",
  "Queuing for approval",
  "Writing audit log",
];

function opsInboxLabel(source: string | undefined): string | null {
  switch (source) {
    case "gmail_live":
      return "Ops read live Gmail — inbox, spam, promotions & updates (last 14d), including prior replies in each thread.";
    case "gmail_empty":
      return "Gmail connected but inbox empty — used demo emails for this run.";
    case "gmail_error":
      return "Gmail token expired or API error — reconnect on Connect, or demo emails used.";
    case "demo_seed":
      return "Gmail not connected — used demo inbox for this run.";
    default:
      return null;
  }
}

function mapApprovalRows(raw: unknown[]): ApprovalRow[] {
  return raw.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      agent_type: String(r.agent_type),
      action_title: String(r.action_title),
      action_type: String(r.action_type),
      risk_level: r.risk_level as ApprovalRow["risk_level"],
      reasoning: String(r.reasoning ?? ""),
      preview: String(r.preview ?? ""),
      consequence_approve: String(r.consequence_approve ?? ""),
      consequence_reject: String(r.consequence_reject ?? ""),
      status: String(r.status ?? "pending"),
      security_flag: r.security_flag as string | null | undefined,
      payload: (r.payload as Record<string, unknown> | null) ?? null,
    };
  });
}

export default function DashboardPage() {
  const [selectedCrew, setSelectedCrew] = useState<CrewType>("ops");
  const [runState, setRunState] = useState<RunState>("idle");
  const [pipelineStep, setPipelineStep] = useState(0);
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [stats, setStats] = useState({ reviewed: 0, proposed: 0, pending: 0, resolved: 0 });
  const [tarsModel, setTarsModel] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<
    "tars_slow" | "no_actionable" | null
  >(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [rateLimitSec, setRateLimitSec] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");
  const [opsInboxNote, setOpsInboxNote] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [founderName, setFounderName] = useState("Jordan");
  const [isDemo, setIsDemo] = useState(false);
  const [growthShipped, setGrowthShipped] = useState(DEFAULT_GROWTH_SHIPPED);
  const [securityStats, setSecurityStats] = useState({
    unauthorized: 0,
    approvalsStored: 0,
    rawInboxStored: false,
    auditRedacted: true,
    demoMode: true,
    tarsConfigured: false,
    retentionLines: [] as string[],
  });

  const activeCrew = CREWS.find((c) => c.id === selectedCrew)!;

  const loadApprovals = useCallback(async () => {
    try {
      const res = await fetch("/api/approvals/list");
      const data = await res.json();
      if (!res.ok) return;
      setApprovals(mapApprovalRows(data.approvals ?? []));
      setStats((s) => ({
        ...s,
        pending: data.stats?.pending ?? 0,
        resolved: data.stats?.resolved ?? 0,
      }));
    } catch {
      // keep existing state
    }
  }, []);

  const loadSecurityStats = useCallback(async () => {
    try {
      const res = await fetch("/api/demo/stats");
      const d = await res.json();
      if (!res.ok) return;
      setSecurityStats({
        unauthorized: d.actions_executed_without_approval ?? 0,
        approvalsStored: d.privacy?.approvals_stored ?? 0,
        rawInboxStored: d.privacy?.raw_inbox_stored ?? false,
        auditRedacted: d.privacy?.audit_log_redacted ?? true,
        demoMode: d.privacy?.demo_mode ?? true,
        tarsConfigured: d.privacy?.tars_configured ?? false,
        retentionLines: d.privacy?.retention_lines ?? [],
      });
      if (d.founder_name) setFounderName(String(d.founder_name).toUpperCase());
      setIsDemo(!!d.is_demo);
    } catch {
      // keep existing state
    }
  }, []);

  useEffect(() => {
    loadApprovals();
    loadSecurityStats();
    try {
      const saved = localStorage.getItem("krews_growth_shipped");
      if (saved?.trim()) setGrowthShipped(saved);
    } catch {
      // ignore
    }
  }, [loadApprovals, loadSecurityStats]);

  useEffect(() => {
    try {
      localStorage.setItem("krews_growth_shipped", growthShipped);
    } catch {
      // ignore
    }
  }, [growthShipped]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    if (rateLimitSec <= 0) return;
    const t = setInterval(() => setRateLimitSec((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [rateLimitSec]);

  const animatePipeline = useCallback(() => {
    setPipelineStep(0);
    const interval = setInterval(() => {
      setPipelineStep((s) => {
        if (s >= PIPELINE_STAGES.length - 1) {
          clearInterval(interval);
          return s;
        }
        return s + 1;
      });
    }, 600);
    return () => clearInterval(interval);
  }, []);

  const handleRun = async () => {
    if (cooldown > 0 || rateLimitSec > 0 || runState === "running") return;

    setRunState("running");
    setErrorMsg(null);
    setUsedFallback(false);
    setFallbackReason(null);
    setTarsModel(null);
    const cleanup = animatePipeline();

    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_type: selectedCrew,
          growth_input:
            selectedCrew === "growth" ? growthShipped.trim() || DEFAULT_GROWTH_SHIPPED : undefined,
        }),
      });

      if (res.status === 429) {
        const data = await res.json();
        setRateLimitSec(data.retryAfterSec ?? 10);
        setRunState("rate_limited");
        cleanup();
        return;
      }

      let data: Record<string, unknown> = {};
      try {
        data = await res.json();
      } catch {
        setRunState("error");
        setErrorMsg("Server error — try again");
        cleanup();
        return;
      }

      if (!res.ok) {
        setRunState("error");
        setErrorMsg((data.error as string) ?? "Run failed");
        cleanup();
        return;
      }

      setPipelineStep(PIPELINE_STAGES.length - 1);
      const runStats = data.stats as Record<string, number> | undefined;

      if (Array.isArray(data.approvals)) {
        setApprovals(mapApprovalRows(data.approvals));
      } else {
        await loadApprovals();
      }

      setStats({
        reviewed: runStats?.items_reviewed ?? 0,
        proposed: runStats?.actions_proposed ?? 0,
        pending: runStats?.pending ?? 0,
        resolved: runStats?.resolved ?? 0,
      });
      setTarsModel((data.tars_model as string) ?? null);
      setUsedFallback(!!data.used_fallback);
      setFallbackReason(
        (data.fallback_reason as "tars_slow" | "no_actionable" | null) ?? null
      );
      setOpsInboxNote(
        selectedCrew === "ops"
          ? opsInboxLabel(data.ops_inbox_source as string | undefined)
          : null
      );
      setRunState("success");
      setCooldown(10);
      const proposed = runStats?.actions_proposed ?? 0;
      const summary =
        typeof data.run_summary === "string" ? data.run_summary : null;
      setLiveMessage(
        proposed > 0
          ? `Crew finished. ${proposed} actions need your approval.`
          : summary ?? `Crew finished. 0 actions need your approval.`
      );
      await loadSecurityStats();
    } catch {
      setRunState("error");
      setErrorMsg("Network error — try again");
    } finally {
      cleanup();
    }
  };

  const handleApprove = async (
    id: string,
    options?: { ackHighRisk?: boolean; deliveryMode?: "draft" | "send" | "acknowledge" }
  ) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/approvals/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approval_id: id,
          acknowledge_high_risk: options?.ackHighRisk,
          delivery_mode: options?.deliveryMode,
        }),
      });
      const data = await res.json();
      if (data.allowed) {
        setActionMessage(data.reason ?? "Action executed");
        await loadApprovals();
        await loadSecurityStats();
      } else {
        setActionMessage(data.reason ?? "Approval blocked");
      }
    } catch {
      setActionMessage("Network error — try again");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/approvals/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approval_id: id }),
      });
      const data = await res.json();
      if (data.allowed) {
        setActionMessage(data.reason ?? "Rejected — no side effects");
        await loadApprovals();
        await loadSecurityStats();
      } else {
        setActionMessage(data.reason ?? "Could not reject");
      }
    } catch {
      setActionMessage("Network error — try again");
    } finally {
      setActionLoading(false);
    }
  };

  const crewApprovals = approvals.filter((a) => a.agent_type === selectedCrew);
  const pendingApprovals = crewApprovals.filter((a) => a.status === "pending");
  const resolvedApprovals = crewApprovals.filter((a) => a.status !== "pending");
  const showPipeline = runState === "running" || runState === "success";
  const showEmpty =
    pendingApprovals.length === 0 && runState !== "running";

  const handleCrewSwitch = (crew: CrewType) => {
    setSelectedCrew(crew);
    const crewPending = approvals.filter(
      (a) => a.agent_type === crew && a.status === "pending"
    );
    if (crewPending.length === 0) {
      setRunState("idle");
      setPipelineStep(0);
      setTarsModel(null);
      setUsedFallback(false);
    }
  };

  const handleClearData = async () => {
    await fetch("/api/demo/clear", { method: "POST" });
    await loadApprovals();
    await loadSecurityStats();
  };

  const handleReset = async () => {
    await fetch("/api/demo/reset", { method: "POST" });
    setApprovals([]);
    setRunState("idle");
    setStats({ reviewed: 0, proposed: 0, pending: 0, resolved: 0 });
    setTarsModel(null);
    setCooldown(0);
    setPipelineStep(0);
    await loadSecurityStats();
  };

  const runButtonLabel = () => {
    if (rateLimitSec > 0) return `[ ⧗ TOO MANY RUNS — WAIT (${rateLimitSec}s) ]`;
    if (cooldown > 0) return `⧗ COOLING DOWN (${cooldown}s)`;
    if (runState === "running") return "[ CREW WORKING... ]";
    if (runState === "success") return "▶ RUN AGAIN";
    return `▶ RUN ${activeCrew.label} CREW`;
  };

  return (
    <WindowChrome title="KREWSAGENT.EXE — Dashboard">
      <AccountModeBadge variant="banner" />
      <h1 className="page-h">{">>"} GOOD MORNING, {founderName}</h1>
      <p className="page-s">
        {isDemo
          ? "Placeholder demo — fictional founder Jordan, simulated data only. Sign up for your real account."
          : "Your crew is ready. Connect Gmail on Setup, then RUN CREW."}
      </p>

      {actionMessage && (
        <p className="tars-badge mb-3" role="status">
          {actionMessage}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {[
          { label: "Reviewed", value: stats.reviewed },
          { label: "Proposed", value: stats.proposed },
          { label: "Pending", value: pendingApprovals.length },
          { label: "Resolved", value: resolvedApprovals.length },
        ].map((stat) => (
          <div key={stat.label} className="stat">
            <div className="stat-num">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {CREWS.map((crew) => (
          <button
            key={crew.id}
            type="button"
            className={`crew-btn ${crew.borderClass} ${
              selectedCrew === crew.id ? "active" : ""
            }`}
            onClick={() => handleCrewSwitch(crew.id)}
            aria-pressed={selectedCrew === crew.id}
            disabled={runState === "running"}
          >
            <div className="crew-btn-label">{crew.label}</div>
            <div
              className={`crew-btn-status ${
                crew.id === "finance" ? "crew-btn-status-read" : ""
              }`}
            >
              {crew.status}
            </div>
          </button>
        ))}
      </div>

      {selectedCrew === "growth" && (
        <div className="card mb-4">
          <label htmlFor="growth-shipped" className="card-title block mb-2">
            {">>"} WHAT DID YOU SHIP THIS WEEK?
          </label>
          <textarea
            id="growth-shipped"
            className="input-retro min-h-[88px] resize-y"
            value={growthShipped}
            onChange={(e) => setGrowthShipped(e.target.value)}
            maxLength={500}
            placeholder="e.g. shipped approval gate UI, Gmail spam triage, hash-chained audit log"
            disabled={runState === "running"}
          />
          <p className="card-desc mt-2">
            Growth crew drafts a LinkedIn post and outreach sequence from this — you copy/paste
            yourself (LinkedIn does not allow bot posting).
          </p>
        </div>
      )}

      <button
        type="button"
        className="run-btn"
        onClick={handleRun}
        disabled={runState === "running" || cooldown > 0 || rateLimitSec > 0}
      >
        {runButtonLabel()}
      </button>

      <div aria-live="polite" className="sr-only">
        {liveMessage}
      </div>

      {opsInboxNote && selectedCrew === "ops" && runState === "success" && (
        <p className="text-base mb-3 text-matcha-bright">{opsInboxNote}</p>
      )}

      {showPipeline && (
        <div className="pipeline-panel">
          <ol>
            {PIPELINE_STAGES.map((stage, i) => {
              const done = runState === "success" || i < pipelineStep;
              const active = runState === "running" && i === pipelineStep;
              return (
                <li
                  key={stage}
                  className={`pipeline-step ${
                    done ? "pipeline-step-done" : active ? "pipeline-step-active" : ""
                  }`}
                >
                  <span className="pipeline-dot" aria-hidden />
                  {stage}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {fallbackReason === "tars_slow" && (
        <p className="text-strawberry-light text-base mb-3">
          [ ⚠ TARS SLOW — SERVED CACHED RUN ]
        </p>
      )}

      {fallbackReason === "no_actionable" && (
        <p className="text-matcha-bright text-base mb-3">
          [ LIVE INBOX CLEAN — SAMPLE DRAFTS FOR DEMO ]
        </p>
      )}

      {tarsModel && (
        <p className="tars-badge">
          {`>>> ROUTED VIA TARS → `}
          <b>{tarsModel}</b>
          {` <<<`}
        </p>
      )}

      {runState === "error" && (
        <div className="card mb-4 border-strawberry">
          <p className="text-strawberry font-bold mb-2">
            [ ⚠ COULDN&apos;T REACH TARS ]
          </p>
          <p className="card-desc">
            {errorMsg ?? "No actions were proposed. Nothing was changed."}
          </p>
        </div>
      )}

      {runState === "running" && (
        <div className="empty-state mb-4">
          <p className="empty-title">[ CREW WORKING... ]</p>
        </div>
      )}

      {showEmpty && (
        <div className="empty-state">
          <p className="empty-title">[ NO PENDING APPROVALS ]</p>
          <p className="empty-sub">Run {activeCrew.label} crew to review your workspace</p>
        </div>
      )}

      {pendingApprovals.length > 0 && (
        <div className="approval-cards">
          {pendingApprovals.map((card) => (
            <ApprovalCard
              key={card.id}
              card={card}
              onApprove={handleApprove}
              onReject={handleReject}
              onCopy={(text) =>
                setActionMessage(
                  text
                    ? "Copied to clipboard — paste into LinkedIn or your email client"
                    : "Could not copy — select text from the preview box"
                )
              }
              onOpenLinkedIn={() =>
                setActionMessage(
                  "Copied — LinkedIn opened in a new tab. Paste into the post box (Ctrl+V / Cmd+V)"
                )
              }
              loading={actionLoading}
            />
          ))}
        </div>
      )}

      {resolvedApprovals.length > 0 && (
        <>
          <div className="section-label">
            {">>"} RESOLVED ({resolvedApprovals.length})
          </div>
          <div className="approval-cards">
            {resolvedApprovals.map((card) => (
              <ApprovalCard
                key={card.id}
                card={card}
                onApprove={handleApprove}
                onReject={handleReject}
                onCopy={(text) =>
                  setActionMessage(
                    text
                      ? "Copied to clipboard — paste into LinkedIn or your email client"
                      : "Could not copy — select text from the preview box"
                  )
                }
                onOpenLinkedIn={() =>
                  setActionMessage(
                    "Copied — LinkedIn opened in a new tab. Paste into the post box (Ctrl+V / Cmd+V)"
                  )
                }
                loading={actionLoading}
              />
            ))}
          </div>
        </>
      )}

      <div className="security-bar">
        <p className="security-row">
          {securityStats.unauthorized} actions executed without your approval
        </p>
        <p className="security-row">
          External workspace content fenced as untrusted input
        </p>
        <p className="security-row">
          No training pipeline — KrewsAgent does not train models on your
          workspace
        </p>
        {securityStats.retentionLines.map((line) => (
          <p key={line} className="security-row">
            {line}
          </p>
        ))}
        <p className="security-row">
          {securityStats.approvalsStored} approval draft
          {securityStats.approvalsStored === 1 ? "" : "s"} on server — use Clear
          Data to wipe
        </p>
        <p className="security-row">
          {securityStats.demoMode
            ? securityStats.tarsConfigured
              ? "DEMO_MODE on · live TARS when reachable · cached fallback when slow"
              : "DEMO_MODE on · cached crew runs (no TARS key configured)"
            : securityStats.tarsConfigured
              ? "Live inference routed through TARS"
              : "TARS not configured — runs will not reach a model"}
        </p>
        <p className="security-row">
          {securityStats.auditRedacted
            ? "Audit log redacted before write · verify chain on Activity"
            : "Audit logging active"}
        </p>
      </div>

      <PrivacyDisclaimer variant="compact" />

      <div className="action-buttons">
        {isDemo ? (
          <button type="button" className="action-btn" onClick={handleReset}>
            [ RESET DEMO ]
          </button>
        ) : (
          <Link href="/connect" className="action-btn">
            [ CONNECT GMAIL → ]
          </Link>
        )}
        <button type="button" className="action-btn" onClick={handleClearData}>
          [ CLEAR MY DATA ]
        </button>
        <Link href="/activity" className="action-btn">
          [ ACTIVITY LOG → ]
        </Link>
      </div>
    </WindowChrome>
  );
}
