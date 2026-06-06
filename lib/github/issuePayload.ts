import type { ApprovalCard } from "@/lib/types/agent";
import type { UntrustedItem } from "@/lib/security/untrustedInput";

export interface IssueItemMeta {
  itemId: string;
  number: number;
}

const ITEM_ID_RE = /^Item-ID:\s*(\S+)/im;
const ISSUE_NUM_RE = /^Issue #(\d+)/m;

export function parseIssueItemMeta(content: string): IssueItemMeta | null {
  const itemId = content.match(ITEM_ID_RE)?.[1];
  const numberMatch = content.match(ISSUE_NUM_RE);
  const number = numberMatch ? Number(numberMatch[1]) : null;
  if (!number || Number.isNaN(number)) return null;

  return {
    itemId: itemId ?? `issue-${number}`,
    number,
  };
}

export function issueNumberFromItemId(itemId: string): number | null {
  const match = itemId.match(/issue-(\d+)/i);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isNaN(n) ? null : n;
}

function cardReferencesItem(card: ApprovalCard, item: UntrustedItem): boolean {
  const haystack = `${card.action_title} ${card.reasoning} ${card.preview}`.toLowerCase();
  if (haystack.includes(item.id.toLowerCase())) return true;

  const meta = parseIssueItemMeta(item.content);
  if (!meta) return false;
  if (haystack.includes(`issue #${meta.number}`)) return true;
  if (haystack.includes(`#${meta.number}`) && haystack.includes("issue")) return true;

  return false;
}

export function findRelatedIssueItem(
  card: ApprovalCard,
  processedItems: UntrustedItem[]
): IssueItemMeta | null {
  const direct = processedItems.find((item) => cardReferencesItem(card, item));
  if (direct) {
    return parseIssueItemMeta(direct.content);
  }

  const issueNumMatch = card.reasoning.match(/issue\s*#(\d+)/i);
  if (issueNumMatch) {
    const number = Number(issueNumMatch[1]);
    const item = processedItems.find((i) => i.id === `issue-${number}`);
    return {
      itemId: item?.id ?? `issue-${number}`,
      number,
    };
  }

  return null;
}

export function attachGitHubIssuePayload(
  payload: Record<string, unknown>,
  card: ApprovalCard,
  processedItems: UntrustedItem[],
  githubIssuesLive?: boolean
): Record<string, unknown> {
  let issueNumber =
    typeof payload.issue_number === "number" ? payload.issue_number : null;

  if (issueNumber == null && typeof payload.item_id === "string") {
    issueNumber = issueNumberFromItemId(payload.item_id);
  }

  let itemId = typeof payload.item_id === "string" ? payload.item_id : undefined;

  if (issueNumber == null || !itemId) {
    const related = findRelatedIssueItem(card, processedItems);
    if (related) {
      issueNumber = issueNumber ?? related.number;
      itemId = itemId ?? related.itemId;
    }
  }

  return {
    ...payload,
    ...(issueNumber != null ? { issue_number: issueNumber } : {}),
    ...(itemId ? { item_id: itemId } : {}),
    ...(githubIssuesLive !== undefined ? { github_live: githubIssuesLive } : {}),
  };
}
