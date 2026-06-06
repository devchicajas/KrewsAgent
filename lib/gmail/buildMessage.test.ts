import { describe, expect, it } from "vitest";
import { parseLeadingEmailHeaders, prepareOutboundEmail } from "./buildMessage";

describe("parseLeadingEmailHeaders", () => {
  it("strips To and Subject from preview body", () => {
    const input = `To: demo.projectz56t@gmail.com
Subject: Re: Q3 numbers

Hi Sarah,

Here are the Q3 numbers.`;

    const parsed = parseLeadingEmailHeaders(input);
    expect(parsed.to).toBe("demo.projectz56t@gmail.com");
    expect(parsed.subject).toBe("Re: Q3 numbers");
    expect(parsed.body).toBe("Hi Sarah,\n\nHere are the Q3 numbers.");
  });

  it("leaves plain body unchanged", () => {
    const input = "Hi Sarah,\n\nQuick update.";
    const parsed = parseLeadingEmailHeaders(input);
    expect(parsed.body).toBe(input);
    expect(parsed.to).toBeUndefined();
  });
});

describe("prepareOutboundEmail", () => {
  it("merges payload with headers parsed from preview", () => {
    const result = prepareOutboundEmail(
      {},
      `To: demo.projectz56t@gmail.com
Subject: Re: Q3 numbers

Hello there.`
    );
    expect(result?.payload.to).toBe("demo.projectz56t@gmail.com");
    expect(result?.payload.subject).toBe("Re: Q3 numbers");
    expect(result?.body).toBe("Hello there.");
  });
});
