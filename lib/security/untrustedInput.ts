import { randomBytes } from "crypto";

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous/gi,
  /disregard\s+(all\s+)?prior/gi,
  /\bsystem\s*:/gi,
  /you\s+are\s+now/gi,
  /admin\s+mode/gi,
  /approve\s+(this|wire|transfer)/gi,
  /```\s*json/gi,
  /"action_type"\s*:/gi,
];

const MAX_ITEM_CHARS = 2000;
const MAX_ITEMS = 10;

export interface UntrustedItem {
  id: string;
  content: string;
  security_flag: string | null;
}

function sanitize(text: string): { sanitized: string; flagged: boolean } {
  let flagged = false;
  let sanitized = text.slice(0, MAX_ITEM_CHARS);
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      flagged = true;
      sanitized = sanitized.replace(pattern, "[neutralized]");
    }
  }
  return { sanitized, flagged };
}

export function fenceExternalContent(items: { id: string; content: string }[]): {
  fenced: string;
  items: UntrustedItem[];
} {
  const limited = items.slice(0, MAX_ITEMS);
  const processed: UntrustedItem[] = [];
  const blocks: string[] = [];

  for (const item of limited) {
    const nonce = randomBytes(8).toString("hex");
    const { sanitized, flagged } = sanitize(item.content);
    processed.push({
      id: item.id,
      content: sanitized,
      security_flag: flagged ? "suspected_injection" : null,
    });
    blocks.push(
      `[EXTERNAL_UNTRUSTED nonce=${nonce}]\n${sanitized}\n[/EXTERNAL_UNTRUSTED nonce=${nonce}]`
    );
  }

  return { fenced: blocks.join("\n\n"), items: processed };
}
