/**
 * Quick local check: simulates Vercel TARS draft path for ops demo inbox.
 * Usage: VERCEL=1 npx tsx scripts/test-tars-run.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import { loadEnvLocal } from "./loadEnv";
import { ALL_SEED_EMAILS } from "../lib/demo/seedEmails";
import { fenceExternalContent } from "../lib/security/untrustedInput";
import { parseAgentRunOutput } from "../lib/security/outputValidation";
import { extractJson, getDraftModel, tarsChat } from "../lib/tarsClient";

loadEnvLocal();

async function main() {
  const playbook = readFileSync(join(process.cwd(), "prompts/playbooks/ops-playbook.md"), "utf-8");
  const draftSystem = readFileSync(join(process.cwd(), "prompts/system/draft.system.txt"), "utf-8");
  const items = ALL_SEED_EMAILS.map((e) => ({
    id: e.id,
    content: `From: ${e.from}\nSubject: ${e.subject}\n\n${e.body}`,
  }));
  const { fenced } = fenceExternalContent(items);
  const trustedUser = `FOUNDER CONTEXT (TRUSTED):\n{}\n\nPLAYBOOK (TRUSTED):\n${playbook}\n\nWORKSPACE ITEMS:\n${fenced}\n\nCrew: ops. stats.actions_executed must always be 0.`;
  const model = getDraftModel("draft");
  const t0 = Date.now();
  console.log("model:", model, "VERCEL:", process.env.VERCEL);
  const { content, model: used } = await tarsChat(model, draftSystem, trustedUser);
  console.log("draft ms:", Date.now() - t0, "used:", used, "len:", content.length);
  try {
    const parsed = parseAgentRunOutput(extractJson(content), "ops");
    console.log("parsed:", !!parsed, "cards:", parsed?.approval_cards.length);
  } catch (e) {
    console.log("parse FAILED:", (e as Error).message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
