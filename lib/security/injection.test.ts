import { describe, it, expect } from "vitest";
import { fenceExternalContent } from "./untrustedInput";
import { filterAllowedCards } from "./outputValidation";
import { INJECTION_TEST_EMAIL } from "@/lib/demo/seedEmails";

describe("prompt injection defense", () => {
  it("fences and flags malicious external content", () => {
    const { fenced, items } = fenceExternalContent([
      {
        id: INJECTION_TEST_EMAIL.id,
        content: INJECTION_TEST_EMAIL.body,
      },
    ]);

    expect(fenced).toContain("[EXTERNAL_UNTRUSTED nonce=");
    expect(fenced).toContain("[/EXTERNAL_UNTRUSTED nonce=");
    expect(items[0].security_flag).toBe("suspected_injection");
    expect(fenced).toContain("[neutralized]");
  });

  it("drops disallowed action types from model output", () => {
    const { allowed, dropped } = filterAllowedCards([
      {
        agent_type: "ops",
        action_title: "Wire transfer",
        action_type: "wire_transfer",
        risk_level: "low",
        reasoning: "injected",
        preview: "send money",
        consequence_approve: "bad",
        consequence_reject: "good",
        payload: {},
      },
    ]);

    expect(allowed).toHaveLength(0);
    expect(dropped).toHaveLength(1);
    expect(dropped[0].action_type).toBe("wire_transfer");
  });
});
