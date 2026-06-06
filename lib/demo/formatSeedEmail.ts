import type { SeedEmail } from "./seedEmails";

const MAX_PRIOR_CHARS = 1200;

export function formatSeedEmailContent(email: SeedEmail): string {
  let out = `From: ${email.from}\nSubject: ${email.subject}`;

  if (email.prior_messages?.length) {
    out += `\n\nEmail thread (${email.prior_messages.length + 1} messages):`;
    for (const prior of email.prior_messages) {
      out += `\n\n--- Earlier · ${prior.from} · ${prior.date} ---\n${prior.body.slice(0, MAX_PRIOR_CHARS)}`;
    }
    out += `\n\n--- Latest · ${email.from} ---`;
  }

  out += `\n\n${email.body}`;
  return out;
}
