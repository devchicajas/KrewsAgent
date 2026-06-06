import { NextResponse } from "next/server";
import { withSecurity } from "@/lib/security/middleware";
import { getDefaultRepoTarget } from "@/lib/github/client";
import { listUserRepos } from "@/lib/github/listRepos";

export const dynamic = "force-dynamic";

export const GET = withSecurity(
  async (_req, _body, auth) => {
    if (auth.isDemo) {
      return NextResponse.json(
        { error: "Sign in with your own account to list GitHub repos" },
        { status: 403 }
      );
    }

    try {
      const repos = await listUserRepos(auth.userId);
      const defaultRepo = getDefaultRepoTarget();
      return NextResponse.json({
        repos,
        default_owner: defaultRepo.owner,
        default_repo: defaultRepo.repo,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to list repos";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  },
  { method: "GET", skipBody: true }
);
