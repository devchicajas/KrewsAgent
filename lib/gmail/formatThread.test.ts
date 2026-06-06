import { describe, expect, it } from "vitest";
import { formatThreadBody } from "./formatThread";

describe("formatThreadBody", () => {
  it("formats multi-message threads chronologically", () => {
    const text = formatThreadBody([
      {
        internalDate: "1000",
        payload: {
          headers: [
            { name: "From", value: "a@test.com" },
            { name: "Date", value: "Mon, 1 Jan 2026" },
          ],
          mimeType: "text/plain",
          body: { data: Buffer.from("First message").toString("base64") },
        },
      },
      {
        internalDate: "2000",
        payload: {
          headers: [
            { name: "From", value: "b@test.com" },
            { name: "Date", value: "Tue, 2 Jan 2026" },
          ],
          mimeType: "text/plain",
          body: { data: Buffer.from("Latest reply").toString("base64") },
        },
      },
    ]);

    expect(text).toContain("Email thread (2 messages)");
    expect(text).toContain("Earlier");
    expect(text).toContain("First message");
    expect(text).toContain("Latest");
    expect(text).toContain("Latest reply");
    expect(text.indexOf("First message")).toBeLessThan(text.indexOf("Latest reply"));
  });
});
