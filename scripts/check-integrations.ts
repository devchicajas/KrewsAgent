/**
 * Verifies Gmail + GitHub OAuth env and GitHub API reachability.
 * Run: npm run integrations:check
 */

import { loadEnvLocal } from "./loadEnv";

loadEnvLocal();

async function main() {
  const { isGmailConfigured } = await import("../lib/gmail/client");
  const { isGitHubConfigured } = await import("../lib/github/client");
  const { fetchOpenIssues } = await import("../lib/github/fetchIssues");

  console.log("\n>> KrewsAgent integrations check\n");
  console.log("Gmail and GitHub OAuth are separate — different accounts OK.\n");

  const gmailOk = isGmailConfigured();
  console.log(
    gmailOk
      ? "✓ Gmail OAuth env configured"
      : "✗ Gmail OAuth — set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET"
  );

  const githubOAuthOk = isGitHubConfigured();
  console.log(
    githubOAuthOk
      ? "✓ GitHub OAuth env configured (Connect GitHub button will work)"
      : "✗ GitHub OAuth — set GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET"
  );

  const owner = process.env.GITHUB_OWNER ?? "demoprojectz56t-max";
  const repo = process.env.GITHUB_REPO ?? "concept-to-code-dash";
  console.log(`\n>> Issues repo: ${owner}/${repo}`);

  const { issues, live } = await fetchOpenIssues();
  if (live) {
    console.log(`✓ GitHub issues API live — ${issues.length} open issue(s)`);
    issues.slice(0, 3).forEach((i) => console.log(`  · #${i.number} ${i.title}`));
  } else {
    console.log("✗ GitHub issues fallback — check network or repo name");
  }

  if (!gmailOk || !githubOAuthOk) {
    console.log("\n  See docs/INTEGRATIONS_SETUP.md\n");
  } else {
    console.log("\n  Ready: sign in → /connect → Connect Gmail + Connect GitHub\n");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
