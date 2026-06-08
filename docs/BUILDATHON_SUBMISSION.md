# KrewsAgent — Tetrate AI Buildathon Submission


---

## App Summary

KrewsAgent is an **approval-gated AI operations agent** for solo founders who cannot hire ops help yet.

One agent runtime runs **four crews** — **Ops**, **Growth**, **Support**, and **Finance**. Each crew reads your real workspace (Gmail threads, GitHub issues, or what you shipped), runs a secure pipeline, and proposes up to **three approval cards**. Nothing sends email, posts to GitHub, or changes anything until you explicitly approve.

**Why it matters:** Most AI tools optimize for speed and act without permission. Founders — especially caregivers stacking product, job, and family — need delegation **without** losing control. KrewsAgent’s rule is: *propose first, execute only when you say yes.* Every run and decision is logged to a hash-chained audit trail.

Built solo for **Tetrate AI Buildathon v2.0**. Tagline: *Work done. Control kept.*

**Try it cold:** https://krews-agent.vercel.app → **Try the demo** (no sign-up) → Dashboard → Run crew → approve cards → Activity.

---

## AI Feature Summary

KrewsAgent is **not a chat wrapper**. AI powers a structured **agent loop**: read workspace → (optional) classify → TARS draft → queue for human approval → execute tools only after approval.

| Crew | AI does | User experience |
|------|---------|-----------------|
| **Ops** | Triages Gmail (inbox + spam + promotions/updates, full threads). Flags phishing/impersonation. Drafts investor and follow-up replies. | Wake up to drafted replies and security warnings — you choose Draft, Send, or Reject. |
| **Support** | Reads open GitHub issues + comment history. Drafts empathetic customer replies. | Approve once to post a real comment on the issue. |
| **Growth** | Turns “what I shipped this week” into a LinkedIn post + cold outreach sequence. | Copy/paste yourself — no bot posting (LinkedIn ToS). |
| **Finance** | Summarizes MRR, runway, and burn from founder context. | Read-only health snapshot — no actions to approve. |

**Shared pipeline (7 stages):** context → untrusted-input fencing → optional TARS classify (skipped in default demo) → TARS draft (crew playbook) → JSON repair if needed → allowlist + risk validation → pending approval queue → audit log.

**Safety AI behaviors:** External email/issue text is fenced as untrusted data (prompt-injection patterns neutralized). Security advisories pair with optional cautious reply drafts for unverified senders. High-risk actions require explicit acknowledgment; email Send requires double confirmation.

---

## How You Are Using Tetrate

Every live crew run routes inference through **Tetrate TARS** (Agent Router Service):

- **Client:** OpenAI-compatible API at `https://api.router.tetrate.ai/v1` (`lib/tarsClient.ts`)
- **Config:** `TARS_API_KEY` + `TARS_BASE_URL` — no vendor SDK lock-in

**Models routed via TARS:**

- **Draft (Ops / Growth / Support):** `claude-haiku-4-5` on Vercel (serverless time limits); `claude-sonnet-4-6` when running locally
- **Finance summary:** `gpt-4o-mini`
- **Optional classify (Ops / Support only, when `DEMO_MODE=false`):** `claude-haiku-4-5` for URGENT / REPLY_NEEDED / FYI / NOISE — **skipped** in the default demo path (what most judges use) for speed
- **Fallback if primary fails:** `gpt-4o-mini` on Vercel; `gpt-4o` and `gemini-2.5-flash` locally

**Per run:**

1. Fence Gmail/GitHub text (or growth input) as untrusted workspace data
2. Optionally call TARS classify (non-demo Ops/Support only)
3. Call TARS with crew playbook → structured JSON `approval_cards`
4. JSON repair pass if the response does not parse
5. Server allowlist + risk floors → insert **pending** approvals (zero side effects)

**Resilience:** Default demo mode races live TARS against a **~55s** wall-clock budget on Vercel (**28s** per-request timeout). If TARS is slow or unreachable, cached fallback proposals still flow through the **same approval gate** — the demo does not dead-end.

**Transparency:** Dashboard shows `>>> ROUTED VIA TARS → [model] <<<` (production runs typically show `claude-haiku-4-5-…`).

TARS is the **reasoning layer** only. Gmail draft/send and GitHub issue comments execute in `approvalGuard.ts` **after** human approve — not inside the model call.

---

## Target User

**Who:** Solo pre-seed founders and side-stackers building nights and weekends — especially **caregivers** with limited hours and zero tolerance for AI sending the wrong email.

**Problem:** They need inbox triage, customer support replies, and growth drafts — but cannot afford an EA, VA, or ops hire yet. Generic AI chatbots and autopilot agents feel risky: one wrong send to an investor or customer is worse than no send at all.

**Solution:** KrewsAgent is the ops crew they cannot hire yet, with one non-negotiable rule: **the agent proposes; the founder disposes.** Delegation without surrender — work gets drafted while control stays with the human.

**Not for:** Funded teams with dedicated ops, or anyone who wants full autopilot with no approval step.

---

## Implementation

**Stack:** Next.js 14 (App Router), Supabase Postgres, Tetrate TARS, Gmail OAuth, GitHub OAuth, deployed on Vercel.

**Architecture — two phases (critical design choice):**

1. **`POST /api/agent/run`** — `runPipeline.ts` reads context, fences untrusted input, calls TARS, validates output, inserts **pending** approvals. **Zero side effects.**
2. **`POST /api/approvals/approve`** — `approvalGuard.ts` is the **only** path that creates Gmail drafts/sends or posts GitHub comments.

**Key decisions:**

- **Hard approval gate** — runs cannot send, post, or pay; only the approve endpoint can
- **Untrusted input fencing** — Gmail/GitHub content wrapped in `[EXTERNAL_UNTRUSTED]` blocks; injection patterns flagged
- **Action allowlist** — only `draft_email`, `draft_support_reply`, `security_advisory`, etc.; unknown types dropped server-side
- **Server-side risk floors** — TARS cannot propose below minimum risk per action type
- **Min retention** — inbox/issues fetched per run, not bulk-archived in our DB
- **Per-user OAuth** — Gmail/GitHub tokens in `integrations` table; Support repo user-selectable
- **Hash-chained audit** — Activity page verifies log integrity
- **Spam-aware Ops** — sender trust hints; security advisory + optional reply for unverified mail
- **Demo isolation** — placeholder mode blocks real OAuth for shared demo sessions

**Tradeoffs (honest):**

- LinkedIn/outreach: copy/paste only — no auto-post (platform ToS + bot risk)
- Gmail Send: requires second click to confirm
- Vercel uses Haiku (not Sonnet) for drafting so runs finish within serverless limits
- Classification skipped in default demo mode for speed; when enabled, classify result is not yet wired into draft (future hardening)
- Finance reads seeded `founder_context` — no Stripe live feed yet (MVP2)
- Google OAuth in Testing mode limits Gmail connect to registered test users until app verification

---

## Links

| Field | URL |
|-------|-----|
| **Hosted app** | https://krews-agent.vercel.app |
| **Repository** | https://github.com/devchicajas/KrewsAgent |
| **Demo video** | https://www.loom.com/share/18497e22dbf84d328277eed6368fbc87 |

**Cold-judge path (no sign-up):** Open hosted app → **Try the demo** → Dashboard → Run each crew → Activity.

**Screenshots:** Full walkthrough with 8 images in [README walkthrough](../README.md#walkthrough) — homepage (dark + light), sign up, connect, Ops, Growth, Support, Finance.

---

## Origin 

A friend and I pitched this idea in a competition — eliminated, not chosen. The pitch ended there; I didn't drop the idea. Pre-seed founders juggling home and work can't hire ops yet; most AI acts without permission. I built KrewsAgent myself: same concept, now working.

