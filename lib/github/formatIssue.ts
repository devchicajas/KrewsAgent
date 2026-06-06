import type { GitHubIssueItem } from "./fetchIssues";

const MAX_COMMENT_CHARS = 1500;
const MAX_ISSUE_CHARS = 5000;
const MAX_COMMENTS_SHOWN = 8;

export function formatIssueContent(issue: GitHubIssueItem): string {
  const header = [
    `Item-ID: ${issue.id}`,
    `Issue #${issue.number} (opened by ${issue.user}): ${issue.title}`,
  ].join("\n");

  let out = `${header}\n\n${issue.body?.trim() || "(no description)"}`;

  const comments = issue.comments ?? [];
  if (comments.length > 0) {
    out += `\n\n--- Prior comments (${comments.length}) ---`;
    for (const c of comments.slice(-MAX_COMMENTS_SHOWN)) {
      const date = c.created_at?.slice(0, 10) ?? "";
      out += `\n\n[${c.user}${date ? ` · ${date}` : ""}]\n${c.body.slice(0, MAX_COMMENT_CHARS)}`;
    }
  }

  return out.slice(0, MAX_ISSUE_CHARS);
}
