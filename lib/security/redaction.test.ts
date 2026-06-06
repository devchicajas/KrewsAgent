import { describe, it, expect } from "vitest";
import { redact } from "./redaction";

describe("redact", () => {
  it("redacts emails", () => {
    expect(redact("Contact jas@example.com please")).toContain("[email]");
    expect(redact("Contact jas@example.com please")).not.toContain("jas@example.com");
  });

  it("redacts API keys", () => {
    expect(redact("key: sk-abcdefghijklmnopqrstuvwxyz123456")).toContain("[redacted-secret]");
  });

  it("redacts github tokens", () => {
    expect(redact("token ghp_abcdefghijklmnopqrstuvwxyz1234")).toContain("[redacted-secret]");
  });

  it("redacts phone numbers", () => {
    expect(redact("call 555-123-4567")).toContain("[phone]");
  });
});
