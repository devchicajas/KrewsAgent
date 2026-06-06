import {
  getGitHubIntegration,
  getGitHubRepoTarget,
  githubAuthHeaders,
  isGitHubConfigured,
} from "./client";

function parseIssueNumber(
  payload: Record<string, unknown>
): number | null {
  if (typeof payload.issue_number === "number") return payload.issue_number;
  const itemId = payload.item_id;
  if (typeof itemId === "string") {
    const match = itemId.match(/issue-(\d+)/i);
    if (match) return Number(match[1]);
  }
  return null;
}

export async function tryPostIssueComment(
  userId: string,
  payload: Record<string, unknown>,
  body: string
): Promise<{ created: boolean; commentUrl?: string; reason?: string }> {
  if (!isGitHubConfigured()) {
    return { created: false, reason: "github_not_configured" };
  }

  const integration = await getGitHubIntegration(userId);
  if (!integration?.access_token) {
    return { created: false, reason: "github_not_connected" };
  }

  const issueNumber = parseIssueNumber(payload);
  if (!issueNumber) {
    return { created: false, reason: "missing_issue_number" };
  }

  const { owner, repo } = await getGitHubRepoTarget(userId);

  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      {
        method: "POST",
        headers: {
          ...githubAuthHeaders(integration.access_token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return { created: false, reason: `github_api_${res.status}:${text.slice(0, 120)}` };
    }

    const data = (await res.json()) as { html_url?: string };
    return { created: true, commentUrl: data.html_url };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "github_api_error";
    return { created: false, reason: msg };
  }
}
