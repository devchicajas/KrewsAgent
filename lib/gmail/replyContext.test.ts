import { describe, expect, it } from "vitest";
import { buildGmailReplyContext, replySubject } from "./replyContext";
import type { InboxMessage } from "./fetchInbox";

describe("replySubject", () => {
  it("prefixes Re: when missing", () => {
    expect(replySubject("Q3 update")).toBe("Re: Q3 update");
    expect(replySubject("Re: Q3 update")).toBe("Re: Q3 update");
  });
});

describe("buildGmailReplyContext", () => {
  it("maps sender email to thread metadata", () => {
    const msg: InboxMessage = {
      id: "msg-1",
      threadId: "thread-99",
      rfcMessageId: "<abc@mail.com>",
      from: "Sarah <sarah@sequoia.com>",
      subject: "Q3 question",
      body: "Hi",
      location: "inbox",
      messageCount: 1,
    };
    const map = buildGmailReplyContext([msg]);
    expect(map.get("sarah@sequoia.com")).toEqual({
      threadId: "thread-99",
      rfcMessageId: "<abc@mail.com>",
      subject: "Q3 question",
      itemId: "msg-1",
    });
  });
});
