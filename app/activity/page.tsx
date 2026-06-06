"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AccountModeBadge } from "@/components/AccountModeBadge";
import { WindowChrome } from "@/components/WindowChrome";
import { formatActivityAction, formatActivityStatus } from "@/lib/formatActivity";

interface LogRow {
  id: string;
  agent_type: string;
  action: string;
  status: string;
  created_at: string;
  reasoning?: string | null;
  tars_model?: string | null;
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return d
    .toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(",", " ·");
}

function logStatusClass(status: string) {
  const label = formatActivityStatus(status);
  if (label === "Rejected") return "log-status-rejected";
  if (label === "Pending") return "log-status-pending";
  return "log-status-approved";
}

export default function ActivityPage() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [auditOk, setAuditOk] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadLog = useCallback(() => {
    fetch("/api/activity/log")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to load log");
        setRows(d.rows ?? []);
        setLoadError(null);
      })
      .catch((e) => {
        setRows([]);
        setLoadError(e.message);
      });
  }, []);

  useEffect(() => {
    fetch("/api/audit/verify")
      .then((r) => r.json())
      .then((d) => setAuditOk(d.intact))
      .catch(() => setAuditOk(false));

    loadLog();
  }, [loadLog]);

  return (
    <WindowChrome title="KREWSAGENT.EXE — Activity Log">
      <AccountModeBadge variant="banner" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="page-h mb-0">{">>"} ACTIVITY LOG</h1>
          <p className="page-s mb-0">
            Every decision your crew made, with reasoning and AI model used.
          </p>
        </div>
        <span className={`text-base ${auditOk ? "badge-matcha" : "badge-danger"}`}>
          {auditOk === null
            ? "[ ... VERIFYING ]"
            : auditOk
              ? "[ ✓ AUDIT CHAIN INTACT ]"
              : "[ ✗ AUDIT CHAIN BROKEN ]"}
        </span>
      </div>

      {loadError && (
        <p className="text-strawberry text-base mb-4">[ ⚠ {loadError} ]</p>
      )}

      <div className="log-table">
        <div className="log-row header">
          <div>Date · Time</div>
          <div>Agent</div>
          <div>Action</div>
          <div>Model</div>
          <div className="text-center">Status</div>
        </div>
        {rows.length === 0 ? (
          <div className="log-empty">[ NO ACTIVITY YET ]</div>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="log-row">
              <div className="log-time">{formatTimestamp(row.created_at)}</div>
              <div className="log-agent">{row.agent_type}</div>
              <div className="log-action">
                {formatActivityAction(row.action, row.reasoning)}
              </div>
              <div className="log-model">{row.tars_model ?? "—"}</div>
              <div className="text-center">
                <span className={`log-status ${logStatusClass(row.status)}`}>
                  {formatActivityStatus(row.status)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="action-buttons">
        <Link href="/dashboard" className="action-btn">
          [ ← BACK TO DASHBOARD ]
        </Link>
        <button type="button" className="action-btn" onClick={loadLog}>
          [ REFRESH ]
        </button>
      </div>
    </WindowChrome>
  );
}
