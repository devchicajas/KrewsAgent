import { describe, expect, it } from "vitest";
import {
  buildOptionalReplyDraftCard,
  ensureOptionalReplyDrafts,
  parseEmailItemMeta,
} from "./ensureOptionalReplyDraft";
import type { AgentRunOutput } from "@/lib/types/agent";

const baseOutput = (cards: AgentRunOutput["approval_cards"]): AgentRunOutput => ({
  run_summary: "test",
  stats: {
    items_reviewed: 1,
    actions_proposed: cards.length,
    approvals_created: 0,
    actions_executed: 0,
  },
  approval_cards: cards,
  deferred_items: [],
  security_notes: [],
  tars_model: "test",
});

describe("parseEmailItemMeta", () => {
  it("parses inbox item headers", () => {
    const meta = parseEmailItemMeta(
      `Item-ID: msg-123
Location: Spam
From: Chica <chicajasdev@gmail.com>
Subject: Q3 numbers for Sequoia

Latest message body`
    );
    expect(meta?.itemId).toBe("msg-123");
    expect(meta?.from).toBe("chicajasdev@gmail.com");
    expect(meta?.subject).toBe("Q3 numbers for Sequoia");
  });
});

describe("ensureOptionalReplyDrafts", () => {
  it("adds optional draft when only security_advisory is proposed", () => {
    const items = [
      {
        id: "msg-123",
        content: `Item-ID: msg-123
Location: Spam
Sender trust: unverified — personal/free email in spam/promotions.
From: Chica <chicajasdev@gmail.com>
Subject: Q3 numbers for Sequoia

Thread body`,
        security_flag: null,
      },
    ];

    const output = ensureOptionalReplyDrafts(
      baseOutput([
        {
          agent_type: "ops",
          action_title: "Security advisory: unverified sender claiming Sequoia affiliation",
          action_type: "security_advisory",
          risk_level: "low",
          reasoning:
            "Sender chicajasdev@gmail.com claims Sequoia affiliation requesting Q3 financial data.",
          preview: "IMPERSONATION ALERT: do not share financial data.",
          consequence_approve: "Founder acknowledges impersonation warning; audit logged.",
          consequence_reject: "Warning dismissed.",
          payload: {},
        },
      ]),
      items
    );

    expect(output.approval_cards).toHaveLength(2);
    expect(output.approval_cards[0].action_type).toBe("security_advisory");
    expect(output.approval_cards[1].action_type).toBe("draft_email");
    expect(output.approval_cards[1].payload.unverified_sender).toBe(true);
    expect(output.approval_cards[1].payload.to).toBe("chicajasdev@gmail.com");
  });

  it("does not duplicate when optional draft already exists", () => {
    const items = [
      {
        id: "msg-123",
        content: `From: Chica <chicajasdev@gmail.com>
Subject: Q3 numbers`,
        security_flag: null,
      },
    ];

    const output = ensureOptionalReplyDrafts(
      baseOutput([
        {
          agent_type: "ops",
          action_title: "Security advisory",
          action_type: "security_advisory",
          risk_level: "low",
          reasoning: "warn",
          preview: "warn",
          consequence_approve: "ack",
          consequence_reject: "dismiss",
          payload: {},
        },
        {
          agent_type: "ops",
          action_title: "Optional reply (unverified sender): Q3",
          action_type: "draft_email",
          risk_level: "medium",
          reasoning: "draft",
          preview: "Hi",
          consequence_approve: "draft",
          consequence_reject: "skip",
          payload: { unverified_sender: true, to: "chicajasdev@gmail.com" },
        },
      ]),
      items
    );

    expect(output.approval_cards).toHaveLength(2);
  });
});

describe("buildOptionalReplyDraftCard", () => {
  it("never includes financial numbers in preview", () => {
    const card = buildOptionalReplyDraftCard(
      {
        itemId: "x",
        from: "demo.projectz56t@gmail.com",
        fromRaw: "Demo <demo.projectz56t@gmail.com>",
        subject: "Sequoia Q3 snapshot",
      },
      {
        agent_type: "ops",
        action_title: "advisory",
        action_type: "security_advisory",
        risk_level: "low",
        reasoning: "r",
        preview: "p",
        consequence_approve: "a",
        consequence_reject: "r",
        payload: {},
      }
    );

    expect(card.preview.toLowerCase()).not.toMatch(/\$\d|mrr:|burn:|runway:/);
    expect(card.preview).toContain("official firm email");
  });
});
