/** Human-readable labels for activity log rows */
export function formatActivityAction(action: string, reasoning?: string | null): string {
  if (reasoning && (action.startsWith("executed:") || action.startsWith("rejected:"))) {
    return reasoning;
  }
  const labels: Record<string, string> = {
    run_started: "Crew run started",
    run_completed: "Crew run completed",
    tars_failure: "TARS unreachable",
    rate_limited: "Rate limited",
    approval_claim_failed: "Approval claim failed",
  };
  return labels[action] ?? action.replace(/_/g, " ");
}

export function formatActivityStatus(status: string): string {
  if (status === "executed") return "Approved";
  if (status === "success") return "Approved";
  if (status === "denied") return "Rejected";
  if (status === "failed") return "Rejected";
  if (status === "pending") return "Pending";
  if (status === "rejected") return "Rejected";
  return status.charAt(0).toUpperCase() + status.slice(1);
}
