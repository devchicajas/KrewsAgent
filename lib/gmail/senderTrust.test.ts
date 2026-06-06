import { describe, expect, it } from "vitest";
import { classifySenderTrust } from "./senderTrust";

describe("classifySenderTrust", () => {
  it("marks firm domain as likely legitimate even in spam", () => {
    expect(
      classifySenderTrust(
        "Sarah Chen <sarah.chen@sequoiacap.com>",
        "Q3 numbers",
        "spam"
      )
    ).toBe("likely_legitimate");
  });

  it("marks free-mail VC claim in spam as unverified", () => {
    expect(
      classifySenderTrust(
        "Sarah from Sequoia <demo.projectz56t@gmail.com>",
        "Q3 numbers",
        "spam"
      )
    ).toBe("unverified");
  });

  it("stays neutral for ordinary inbox mail", () => {
    expect(
      classifySenderTrust("Chipotle <chipotle@email.chipotle.com>", "Free chips", "inbox")
    ).toBe("neutral");
  });

  it("marks personal email with investor ask in spam as unverified", () => {
    expect(
      classifySenderTrust(
        "Alex <alex.founder@gmail.com>",
        "Q3 numbers before Thursday",
        "spam"
      )
    ).toBe("unverified");
  });

  it("stays neutral for random free-mail spam without investor cues", () => {
    expect(
      classifySenderTrust("Deals <promo@gmail.com>", "Win a free cruise", "spam")
    ).toBe("neutral");
  });
});
