/** Gmail API scopes — read inbox for Ops; compose drafts or send on explicit approve */
export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
];

export const GMAIL_SCOPE_STRING = GMAIL_SCOPES.join(" ");
