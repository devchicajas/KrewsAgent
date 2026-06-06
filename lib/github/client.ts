import { createServiceClient } from "@/lib/supabase/server";

export interface GitHubIntegrationPayload {
  access_token: string;
  token_type?: string;
  scope?: string;
  github_login?: string;
  repo_owner?: string;
  repo_name?: string;
}

function isRealEnvValue(value: string | undefined, placeholder: string): boolean {
  return !!value && value.trim() !== "" && value !== placeholder;
}

export function isGitHubConfigured(): boolean {
  return (
    isRealEnvValue(process.env.GITHUB_CLIENT_ID, "your_github_client_id_here") &&
    isRealEnvValue(process.env.GITHUB_CLIENT_SECRET, "your_github_client_secret_here")
  );
}

export function githubRedirectUri(): string {
  return (
    process.env.GITHUB_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/github/callback`
  );
}

export function getDefaultRepoTarget(): { owner: string; repo: string } {
  return {
    owner: process.env.GITHUB_OWNER ?? "demoprojectz56t-max",
    repo: process.env.GITHUB_REPO ?? "concept-to-code-dash",
  };
}

export function parseGitHubPayload(
  payload: unknown
): GitHubIntegrationPayload | null {
  const p = (payload ?? {}) as GitHubIntegrationPayload;
  return p.access_token ? p : null;
}

export async function getGitHubIntegration(
  userId: string
): Promise<GitHubIntegrationPayload | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("integrations")
    .select("connected, payload")
    .eq("user_id", userId)
    .eq("provider", "github")
    .maybeSingle();

  if (error) {
    console.error("[github] integration read failed:", error.message);
    return null;
  }
  if (!data) return null;
  return parseGitHubPayload(data.payload);
}

export function isGitHubRowConnected(
  row: { connected?: boolean; payload?: unknown } | undefined
): boolean {
  if (!row) return false;
  return !!row.connected || !!parseGitHubPayload(row.payload)?.access_token;
}

/** @deprecated use getGitHubIntegration */
export async function getGitHubTokens(
  userId: string
): Promise<GitHubIntegrationPayload | null> {
  return getGitHubIntegration(userId);
}

export async function getGitHubRepoTarget(userId?: string): Promise<{
  owner: string;
  repo: string;
  selected_by_user: boolean;
}> {
  const fallback = getDefaultRepoTarget();

  if (!userId) {
    return { ...fallback, selected_by_user: false };
  }

  const integration = await getGitHubIntegration(userId);
  if (integration?.repo_owner && integration?.repo_name) {
    return {
      owner: integration.repo_owner,
      repo: integration.repo_name,
      selected_by_user: true,
    };
  }

  return { ...fallback, selected_by_user: false };
}

export async function saveGitHubTokens(
  userId: string,
  tokens: Partial<GitHubIntegrationPayload>
): Promise<void> {
  const supabase = createServiceClient();
  const existing = await getGitHubIntegration(userId);

  const payload: GitHubIntegrationPayload = {
    access_token: tokens.access_token ?? existing?.access_token ?? "",
    token_type: tokens.token_type ?? existing?.token_type,
    scope: tokens.scope ?? existing?.scope,
    github_login: tokens.github_login ?? existing?.github_login,
    repo_owner: tokens.repo_owner ?? existing?.repo_owner,
    repo_name: tokens.repo_name ?? existing?.repo_name,
  };

  if (!payload.access_token) {
    throw new Error("GitHub access_token required");
  }

  const { error } = await supabase.from("integrations").upsert(
    {
      user_id: userId,
      provider: "github",
      connected: true,
      connected_at: new Date().toISOString(),
      payload,
    },
    { onConflict: "user_id,provider" }
  );
  if (error) throw new Error(error.message);
}

export async function updateGitHubRepoSelection(
  userId: string,
  owner: string,
  repo: string
): Promise<void> {
  const integration = await getGitHubIntegration(userId);
  if (!integration?.access_token) {
    throw new Error("Connect GitHub before choosing a repo");
  }

  await saveGitHubTokens(userId, {
    ...integration,
    repo_owner: owner.trim(),
    repo_name: repo.trim(),
  });
}

export async function fetchGitHubLogin(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "KrewsAgent",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { login?: string };
    return data.login ?? null;
  } catch {
    return null;
  }
}

export async function isGitHubConnected(userId: string): Promise<boolean> {
  const integration = await getGitHubIntegration(userId);
  return !!integration?.access_token && isGitHubConfigured();
}

/** @deprecated use getDefaultRepoTarget or getGitHubRepoTarget */
export function githubRepoTarget(): { owner: string; repo: string } {
  return getDefaultRepoTarget();
}

export function githubAuthHeaders(
  accessToken?: string
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "KrewsAgent",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}
