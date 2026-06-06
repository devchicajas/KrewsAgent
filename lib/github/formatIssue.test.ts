import { describe, expect, it } from "vitest";
import { formatIssueContent } from "./formatIssue";

describe("formatIssueContent", () => {
  it("includes prior comments in issue context", () => {
    const text = formatIssueContent({
      id: "issue-1",
      number: 1,
      title: "Bug report",
      body: "App crashes on login",
      user: "alice",
      comments: [
        { user: "bob", body: "Same here on iOS", created_at: "2026-05-28T10:00:00Z" },
        { user: "jas", body: "Reproducing now", created_at: "2026-05-29T12:00:00Z" },
      ],
    });

    expect(text).toContain("Prior comments (2)");
    expect(text).toContain("[bob · 2026-05-28]");
    expect(text).toContain("Reproducing now");
  });
});
