# KrewsAgent — Tetrate AI Buildathon Submission

---

## Basics

**Title**

KrewsAgent

**One-Liner**

AI ops crews for solo founders — every action waits for your approval before it runs.

**Target User**

Solo pre-seed founders and side-stackers — especially caregivers — who can't hire ops help yet but still need inbox, support, and growth work done safely.

**Slug**

krewsagent

---

## Project Overview

### Origin

A friend and I pitched this idea in a competition — eliminated, not chosen. The pitch ended there; I didn't drop the idea. Pre-seed founders juggling home and work can't hire ops yet; most AI acts without permission. I built KrewsAgent myself: same concept, now working.

### App Summary

KrewsAgent is an approval-gated AI agent for lean founders. Four crews — **Ops**, **Growth**, **Support**, and **Finance** — read your real workspace (Gmail, GitHub, what you shipped), draft actions through a secure pipeline, and queue them as **approval cards**. Nothing sends, posts, or modifies until you explicitly approve.

**Tagline:** Work done. Control kept.

Judges can click **TRY THE DEMO** (no sign-up, simulated data) or sign up to connect real Gmail + GitHub. Clone the repo and run locally — see README.

### AI Feature Summary

- **Ops** — Reads live Gmail (inbox + spam + promotions/updates). Classifies investor/deadline mail vs noise. Drafts replies. Flags phishing in spam with security advisories.
- **Support** — Fetches open GitHub issues. Drafts customer replies. Approve posts a real comment.
- **Growth** — Custom “what I shipped” input → LinkedIn + outreach drafts (copy/paste; no bot posting).
- **Finance** — Read-only runway / MRR summary from founder context.

Shared **7-stage pipeline:** context → classify → plan → risk floor → TARS draft → approval guard → hash-chained audit log.

### How You Are Using Tetrate

Every live crew run routes inference through **TARS** (Tetrate Agent Router Service):

- **Endpoint:** `https://api.router.tetrate.ai/v1` (OpenAI-compatible client)
- **Models:** `claude-sonnet-4-6` (drafting), `claude-haiku-4-5` (classification)
- **Fallbacks:** `gpt-4o`, `gemini-2.5-flash` if primary model fails
- **Integration:** `TARS_API_KEY` + `TARS_BASE_URL` — two env vars, no SDK lock-in
- **Resilience:** `DEMO_MODE` tries live TARS (45s timeout); cached fallback uses the same approval gate if slow
- **UI:** Dashboard shows `>>> ROUTED VIA TARS → claude-sonnet-4-6 <<<` on success

TARS turns real inbox and issue data into grounded drafts — not generic chat.

### Target User

**Who:** Solo pre-seed founders on nights and weekends. Caregivers with limited hours. Anyone between “doing it all myself” and “ready to hire.”

**Problem:** AI agents promise automation; founders fear wrong sends and lost control.

**Solution:** Delegation without surrender. The agent proposes; the founder disposes.

### Implementation

**Stack:** Next.js 14, Supabase Postgres, TARS, Gmail/GitHub OAuth.

**Key decisions:**

1. Hard approval gate — runs create `pending` only; `/api/approvals/approve` is the sole execution path
2. Untrusted input fencing — external Gmail/GitHub content nonce-wrapped; injection flagged
3. Spam-aware Ops — sender trust hints; security advisory + optional reply for unverified mail
4. Min retention — inbox/issues read per run, not bulk-stored
5. Demo isolation — placeholder mode blocks real OAuth

**Tradeoffs:** LinkedIn copy/paste only (ToS). Gmail send requires double confirm. Classify skipped in demo for speed.

---

## Links

**Public Repository URL**

https://github.com/devchicajas/KrewsAgent

**Hosted App URL**

*(not deployed — judges can run locally per README)*

---

## Media

**Screenshots**

- Dashboard with approval cards + TARS badge
- Ops card (Draft / Send buttons)
- Growth card (Copy text / Open LinkedIn)

**Demo Video**

*(optional — 60s: Try Demo → Run Ops → approve → Growth → Activity audit)*

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
