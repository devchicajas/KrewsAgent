import { getGitHubIntegration, githubAuthHeaders } from "./client";

export interface GitHubRepoOption {
  owner: string;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
}

export async function listUserRepos(
  userId: string
): Promise<GitHubRepoOption[]> {
  const integration = await getGitHubIntegration(userId);
  if (!integration?.access_token) {
    throw new Error("GitHub not connected");
  }

  const res = await fetch(
    "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
    {
      headers: githubAuthHeaders(integration.access_token),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(`GitHub repos list failed: ${res.status}`);
  }

  const raw = (await res.json()) as Array<{
    name: string;
    full_name: string;
    private: boolean;
    html_url: string;
    owner: { login: string };
  }>;

  return raw.map((r) => ({
    owner: r.owner.login,
    name: r.name,
    full_name: r.full_name,
    private: r.private,
    html_url: r.html_url,
  }));
}

export async function verifyRepoAccess(
  userId: string,
  owner: string,
  repo: string
): Promise<boolean> {
  const integration = await getGitHubIntegration(userId);
  if (!integration?.access_token) return false;

  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    {
      headers: githubAuthHeaders(integration.access_token),
      cache: "no-store",
    }
  );

  return res.ok;
}
