import { NextResponse } from "next/server";
import { z } from "zod";
import { withSecurity } from "@/lib/security/middleware";
import { updateGitHubRepoSelection } from "@/lib/github/client";
import { verifyRepoAccess } from "@/lib/github/listRepos";

export const dynamic = "force-dynamic";

const schema = z.object({
  owner: z.string().min(1).max(100),
  repo: z.string().min(1).max(100),
});

export const POST = withSecurity(
  async (_req, body, auth) => {
    if (auth.isDemo) {
      return NextResponse.json(
        { error: "Repo selection requires your own account — not placeholder demo" },
        { status: 403 }
      );
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "owner and repo required" },
        { status: 400 }
      );
    }

    const { owner, repo } = parsed.data;
    const ok = await verifyRepoAccess(auth.userId, owner, repo);
    if (!ok) {
      return NextResponse.json(
        {
          error:
            "Cannot access that repo with your GitHub account — pick one you own or can access.",
        },
        { status: 403 }
      );
    }

    try {
      await updateGitHubRepoSelection(auth.userId, owner, repo);
      return NextResponse.json({
        ok: true,
        owner,
        repo,
        repo_url: `https://github.com/${owner}/${repo}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save repo";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  },
  { method: "POST", schema }
);
