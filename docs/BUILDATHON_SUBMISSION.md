# KrewsAgent — Tetrate AI Buildathon Submission

Copy each section below into the matching Tetrate form field.

---

## Basics

**Title**

KrewsAgent

**One-Liner**

AI ops crews for solo founders — every action waits for your approval before it runs.

**Target User (short — form field)**

Solo pre-seed founders and side-stackers — especially caregivers — who cannot hire ops help yet but still need inbox, support, and growth work done safely.

**Slug**

krewsagent

---

## App Summary

KrewsAgent is an **approval-gated AI operations agent** for solo founders who cannot hire ops help yet.

One agent runtime runs **four crews** — **Ops**, **Growth**, **Support**, and **Finance**. Each crew reads your real workspace (Gmail threads, GitHub issues, or what you shipped), runs a secure pipeline, and proposes up to **three approval cards**. Nothing sends email, posts to GitHub, or changes anything until you explicitly approve.

**Why it matters:** Most AI tools optimize for speed and act without permission. Founders — especially caregivers stacking product, job, and family — need delegation **without** losing control. KrewsAgent’s rule is: *propose first, execute only when you say yes.* Every run and decision is logged to a hash-chained audit trail.

Built solo for **Tetrate AI Buildathon v2.0**. Tagline: *Work done. Control kept.*

**Try it cold:** https://krews-agent.vercel.app → **Try the demo** (no sign-up) → Dashboard → Run crew → approve cards → Activity.

---

## AI Feature Summary

KrewsAgent is **not a chat wrapper**. AI powers a structured **agent loop**: read workspace → classify → draft actions → queue for human approval → execute tools only after approval.

| Crew | AI does | User experience |
|------|---------|-----------------|
| **Ops** | Triages Gmail (inbox + spam + promotions/updates, full threads). Flags phishing/impersonation. Drafts investor and follow-up replies. | Wake up to drafted replies and security warnings — you choose Draft, Send, or Reject. |
| **Support** | Reads open GitHub issues + comment history. Drafts empathetic customer replies. | Approve once to post a real comment on the issue. |
| **Growth** | Turns “what I shipped this week” into a LinkedIn post + cold outreach sequence. | Copy/paste yourself — no bot posting (LinkedIn ToS). |
| **Finance** | Summarizes MRR, runway, and burn from founder context. | Read-only health snapshot — no actions to approve. |

**Shared pipeline (7 stages):** context → untrusted-input fencing → TARS classification → TARS drafting (crew playbook) → allowlist + risk validation → pending approval queue → audit log.

**Safety AI behaviors:** External email/issue text is fenced as untrusted data (prompt-injection patterns neutralized). Security advisories pair with optional cautious reply drafts for unverified senders. High-risk actions require explicit acknowledgment; email Send requires double confirmation.

---

## How You Are Using Tetrate

Every live crew run routes inference through **Tetrate TARS** (Agent Router Service):

- **Client:** OpenAI-compatible API at `https://api.router.tetrate.ai/v1` (`lib/tarsClient.ts`)
- **Config:** `TARS_API_KEY` + `TARS_BASE_URL` — no vendor SDK lock-in
- **Drafting:** `claude-sonnet-4-6` — turns fenced Gmail/GitHub workspace + crew playbook into structured JSON `approval_cards`
- **Classification:** `claude-haiku-4-5` — triage labels (URGENT / REPLY_NEEDED / FYI / NOISE)
- **Fallbacks:** `gpt-4o`, `gemini-2.5-flash` if the primary model fails or times out
- **Resilience:** Demo mode tries live TARS first (~45–55s budget on Vercel); if unreachable, cached fallback still flows through the **same approval gate** so the demo never dead-ends
- **Transparency:** Dashboard shows `>>> ROUTED VIA TARS → [model] <<<` after each successful run

TARS is the **reasoning layer** between real workspace data and grounded proposals. Tool execution (Gmail draft/send, GitHub comment) happens **after** approval — not inside the model call.

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
- Classification skipped in demo mode for speed (drafting still uses TARS)
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

## Origin (optional context — not a separate form field)

A friend and I pitched this idea in a competition — eliminated, not chosen. The pitch ended there; I didn't drop the idea. Pre-seed founders juggling home and work can't hire ops yet; most AI acts without permission. I built KrewsAgent myself: same concept, now working.

---

## Private Notes — Judges & Admins Only

### Setup Notes

**Quick demo (no OAuth):**

1. `git clone https://github.com/devchicajas/KrewsAgent`
2. `cp .env.example .env.local` — fill Supabase keys + `AUTH_SECRET`
3. `npm install && npm run seed && npm run dev`
4. Open http://localhost:3000 → **TRY THE DEMO** → **RUN CREW**

Supabase SQL: `db/schema.sql` then `db/auth-migrations-combined.sql`

Full OAuth: `docs/INTEGRATIONS_SETUP.md` · `npm run integrations:check`

### Demo Credentials

**Demo mode (recommended):** **TRY THE DEMO** — no login. Fictional founder Jordan, simulated inbox.

**Real account (optional):** Sign up → `/connect` → Gmail + GitHub. Support demo issues: https://github.com/demoprojectz56t-max/concept-to-code-dash/issues

### Internal Notes

- Ops reads inbox + spam; approve → Gmail draft or send (send = double confirm)
- Support approve → real GitHub comment
- Growth → shipped input + Open LinkedIn (copy + open feed)
- Activity page — verify audit hash chain
- No training on user data

**Private Repository URL**

*(leave blank — repo is public)*
