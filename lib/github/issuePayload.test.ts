import { describe, expect, it } from "vitest";
import {
  attachGitHubIssuePayload,
  parseIssueItemMeta,
} from "./issuePayload";
import type { ApprovalCard } from "@/lib/types/agent";

const issueContent = `Item-ID: issue-42
Issue #42 (opened by megan): Allergic reaction concern

User reports incorrect allergen info.`;

describe("parseIssueItemMeta", () => {
  it("parses item id and issue number", () => {
    expect(parseIssueItemMeta(issueContent)).toEqual({
      itemId: "issue-42",
      number: 42,
    });
  });
});

describe("attachGitHubIssuePayload", () => {
  const card: ApprovalCard = {
    agent_type: "support",
    action_title: "Reply to issue #42",
    action_type: "draft_support_reply",
    risk_level: "high",
    reasoning: "Issue #42 is a safety concern needing acknowledgment.",
    preview: "Thanks for flagging this — we're reviewing allergen data today.",
    consequence_approve: "Posts comment on GitHub.",
    consequence_reject: "No comment.",
    payload: {},
  };

  it("wires issue_number from matched workspace item", () => {
    const payload = attachGitHubIssuePayload(
      {},
      card,
      [{ id: "issue-42", content: issueContent, security_flag: null }],
      true
    );

    expect(payload.issue_number).toBe(42);
    expect(payload.item_id).toBe("issue-42");
    expect(payload.github_live).toBe(true);
  });
});
