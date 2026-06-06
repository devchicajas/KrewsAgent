/**
 * Fetches open issues + comment history from the user's chosen repo.
 */

import { formatIssueContent } from "./formatIssue";
import { getGitHubIntegration, getGitHubRepoTarget, githubAuthHeaders } from "./client";

export interface IssueComment {
  user: string;
  body: string;
  created_at: string;
}

export interface GitHubIssueItem {
  id: string;
  number: number;
  title: string;
  body: string;
  user: string;
  comments?: IssueComment[];
}

export { formatIssueContent };

const FALLBACK_ISSUES: GitHubIssueItem[] = [
  {
    id: "issue-1",
    number: 1,
    title: "Allergic reaction concern with recipe data",
    body: "User Megan reports incorrect allergen info on a saved recipe.",
    user: "megan",
    comments: [
      {
        user: "megan",
        body: "I saved the chicken stir-fry recipe and it didn't flag almonds in the ingredients list.",
        created_at: "2026-05-28T10:00:00Z",
      },
      {
        user: "jas",
        body: "Thanks Megan — I'm pulling the recipe data today and will add a clearer allergen warning in the next release.",
        created_at: "2026-05-29T14:30:00Z",
      },
    ],
  },
  {
    id: "issue-2",
    number: 2,
    title: "Refund request — charged twice",
    body: "User David was billed twice and wants a refund.",
    user: "david",
    comments: [
      {
        user: "david",
        body: "I was charged on May 1 and May 15 for the same plan. Can you refund one of them?",
        created_at: "2026-05-27T09:00:00Z",
      },
    ],
  },
  {
    id: "issue-3",
    number: 3,
    title: "Partner sharing / household accounts",
    body: "User Priya asks about sharing meal plans with a partner.",
    user: "priya",
    comments: [],
  },
];

async function fetchIssueComments(
  owner: string,
  repo: string,
  issueNumber: number,
  headers: Record<string, string>
): Promise<IssueComment[]> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=20`,
      { headers, cache: "no-store" }
    );
    if (!res.ok) return [];

    const raw = (await res.json()) as Array<{
      user?: { login?: string };
      body?: string | null;
      created_at?: string;
    }>;

    return raw.map((c) => ({
      user: c.user?.login ?? "unknown",
      body: c.body ?? "",
      created_at: c.created_at ?? "",
    }));
  } catch {
    return [];
  }
}

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

    const openIssues = raw.filter((i) => !i.pull_request).slice(0, 10);

    const issues: GitHubIssueItem[] = await Promise.all(
      openIssues.map(async (i) => {
        const comments = await fetchIssueComments(owner, repo, i.number, headers);
        return {
          id: `issue-${i.number}`,
          number: i.number,
          title: i.title,
          body: i.body ?? "",
          user: i.user.login,
          comments,
        };
      })
    );

    if (issues.length === 0) {
      return { issues: FALLBACK_ISSUES, live: false, connected };
    }
    return { issues, live: true, connected };
  } catch {
    return { issues: FALLBACK_ISSUES, live: false, connected };
  }
}
