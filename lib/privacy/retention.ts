/** Honest privacy copy — shared across landing, connect, dashboard, and stats API */

export interface PrivacyNoticeSection {
  id: string;
  label: string;
  accent: "matcha" | "strawberry" | "neutral";
  items: string[];
}

export const PRIVACY_NOTICE_SECTIONS: PrivacyNoticeSection[] = [
  {
    id: "stored",
    label: "ON OUR SERVER",
    accent: "matcha",
    items: [
      "Approval draft previews until Reset or Clear Data",
      "Redacted audit log entries (verify chain on Activity)",
      "Gmail OAuth tokens when you connect — until you disconnect",
    ],
  },
  {
    id: "not-archived",
    label: "NOT ARCHIVED IN OUR DB",
    accent: "strawberry",
    items: [
      "Raw Gmail inbox — read per run when connected, not bulk-stored",
      "GitHub issues — fetched read-only per Support run, not cached",
      "Demo fixtures — processed in memory per run only",
    ],
  },
  {
    id: "inference",
    label: "INFERENCE & TRAINING",
    accent: "neutral",
    items: [
      "Live crew runs may send workspace excerpts to TARS + model providers under their API terms",
      "KrewsAgent does not train models on your workspace",
    ],
  },
];

/** Flat string for README / exports */
export const PRIVACY_DISCLAIMER = PRIVACY_NOTICE_SECTIONS.flatMap((s) =>
  s.items.map((item) => item)
).join(" ");

export interface IntegrationRetentionState {
  demo_mode: boolean;
  gmail: { connected: boolean; simulated: boolean };
  github: { connected: boolean; simulated: boolean };
}

/** One-line summary for security cards */
export function minRetentionSummary(): string {
  return "Raw retention depends on what you connect — demo sources stay in memory per run; live Gmail/GitHub are read per run, not inbox-archived in our DB. Approval previews and audit entries persist until you clear them.";
}

/** Dashboard / stats bar — one row per connected source */
export function describeRawRetention(state: IntegrationRetentionState): string[] {
  const lines: string[] = [];

  if (state.gmail.simulated) {
    lines.push(
      "Gmail (simulated): demo inbox processed in memory per Ops run — not stored in our DB"
    );
  } else if (state.gmail.connected) {
    lines.push(
      "Gmail (connected): inbox + spam + tabs read per Ops run; draft or send only on your explicit approve"
    );
  } else {
    lines.push(
      "Gmail (not connected): Ops crew uses demo inbox only — nothing from your real inbox"
    );
  }

  if (state.github.simulated) {
    lines.push(
      "GitHub (simulated): demo issues in memory per Support run — not stored in our DB"
    );
  } else {
    lines.push(
      "GitHub (live read-only): issues fetched per Support run — not cached in our DB"
    );
  }

  return lines;
}

export function gmailRetentionNote(
  simulated: boolean,
  connected: boolean
): string {
  if (simulated) {
    return "Demo inbox only — processed in memory per run, not archived in our database.";
  }
  if (connected) {
    return "Inbox, spam, and category tabs read per run for triage — not bulk-stored in our DB. OAuth token kept until you disconnect.";
  }
  return "Not connected — Ops uses demo fixtures until you authorize Gmail.";
}

export function githubRetentionNote(simulated: boolean): string {
  if (simulated) {
    return "Connect GitHub to post comments on approve. Issues may use demo fixtures until connected.";
  }
  return "Live issues per Support run — OAuth token stored until disconnect. Approving posts GitHub comments.";
}
