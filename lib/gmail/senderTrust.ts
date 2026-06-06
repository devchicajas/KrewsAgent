import type { InboxLocation } from "./fetchInbox";

const FREE_MAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
]);

/** Domains commonly used by real investor / partner mail */
const TRUSTED_FIRM_DOMAINS = [
  "sequoiacap.com",
  "a16z.com",
  "benchmark.com",
  "accel.com",
  "ycombinator.com",
  "greylock.com",
  "foundersfund.com",
  "nea.com",
  "lightspeedvp.com",
  "indexventures.com",
];

const VC_NAME_PATTERN =
  /sequoia|a16z|andreessen|benchmark|accel|y combinator|greylock|founders fund/i;

const INVESTOR_ASK_PATTERN =
  /q[1-4]|investor|runway|mrr|term sheet|intro|partner meeting|deadline|follow.?up|snapshot|numbers before/i;

export type SenderTrust = "likely_legitimate" | "unverified" | "neutral";

function extractDomain(from: string): string {
  const angle = from.match(/<([^>]+)>/);
  const email = (angle ? angle[1] : from).trim().toLowerCase();
  const at = email.lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1) : "";
}

export function classifySenderTrust(
  from: string,
  subject: string,
  location: InboxLocation
): SenderTrust {
  const domain = extractDomain(from);
  if (!domain) return "neutral";

  const inRiskyFolder = location === "spam" || location === "promotions";
  const claimsMajorVc = VC_NAME_PATTERN.test(`${from} ${subject}`);
  const isFreeMail = FREE_MAIL_DOMAINS.has(domain);
  const isFirmDomain = TRUSTED_FIRM_DOMAINS.some(
    (d) => domain === d || domain.endsWith(`.${d}`)
  );

  if (isFirmDomain) return "likely_legitimate";

  const looksLikeInvestorAsk = INVESTOR_ASK_PATTERN.test(`${subject}`);
  if (inRiskyFolder && isFreeMail && (claimsMajorVc || looksLikeInvestorAsk)) {
    return "unverified";
  }

  return "neutral";
}

export function senderTrustHint(
  from: string,
  subject: string,
  location: InboxLocation
): string {
  const trust = classifySenderTrust(from, subject, location);
  switch (trust) {
    case "likely_legitimate":
      return "Sender trust: likely legitimate firm domain — if investor/deadline ask, prefer draft_email (rescued from spam).";
    case "unverified":
      return "Sender trust: unverified — personal/free email in spam/promotions. If investor/deadline ask: propose security_advisory (LOW) AND draft_email titled 'Optional reply (unverified sender):' (MEDIUM, payload.unverified_sender=true). Founder chooses whether to reply.";
    default:
      return "";
  }
}
