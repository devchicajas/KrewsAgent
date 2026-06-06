/**
 * Fetches open issues from the user's chosen repo (or env default).
 */

import { getGitHubIntegration, getGitHubRepoTarget, githubAuthHeaders } from "./client";

export interface GitHubIssueItem {
  id: string;
  number: number;
  title: string;
  body: string;
  user: string;
}

const FALLBACK_ISSUES: GitHubIssueItem[] = [
  {
    id: "issue-1",
    number: 1,
    title: "Allergic reaction concern with recipe data",
    body: "User Megan reports incorrect allergen info on a saved recipe.",
    user: "megan",
  },
  {
    id: "issue-2",
    number: 2,
    title: "Refund request — charged twice",
    body: "User David was billed twice and wants a refund.",
    user: "david",
  },
  {
    id: "issue-3",
    number: 3,
    title: "Partner sharing / household accounts",
    body: "User Priya asks about sharing meal plans with a partner.",
    user: "priya",
  },
];

export async function fetchOpenIssues(userId?: string): Promise<{
  issues: GitHubIssueItem[];
  live: boolean;
  connected: boolean;
}> {
  const { owner, repo } = await getGitHubRepoTarget(userId);
  let connected = false;

  const integration = userId ? await getGitHubIntegration(userId) : null;
  const headers = githubAuthHeaders(integration?.access_token);

  if (integration?.access_token) {
    connected = true;
  } else {
    const token = process.env.GITHUB_TOKEN;
    if (token && token !== "your_github_pat_here") {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=10`,
      { headers, cache: "no-store" }
    );
    if (!res.ok) throw new Error(`GitHub ${res.status}`);

    const raw = (await res.json()) as Array<{
      number: number;
      title: string;
      body: string | null;
      user: { login: string };
      pull_request?: unknown;
    }>;

    const issues = raw
      .filter((i) => !i.pull_request)
      .slice(0, 10)
      .map((i) => ({
        id: `issue-${i.number}`,
        number: i.number,
        title: i.title,
        body: i.body ?? "",
        user: i.user.login,
      }));

    if (issues.length === 0) {
      return { issues: FALLBACK_ISSUES, live: false, connected };
    }
    return { issues, live: true, connected };
  } catch {
    return { issues: FALLBACK_ISSUES, live: false, connected };
  }
}
