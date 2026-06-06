# KrewsAgent

**Work done. Control kept.**

Your AI ops crew — for founders who can't hire help yet, but still can't afford to drop the ball.

> [Live app](https://krews-agent.vercel.app) · [Repo](https://github.com/devchicajas/KrewsAgent) · Built for the [Tetrate AI Buildathon v2.0](https://tetrate.io)

---


## What is KrewsAgent?

KrewsAgent is an **AI agent with four crews** that read your real work — Gmail, GitHub, what you shipped — and draft what you should do next.

It is **not** a chatbot you babysit. It is **not** an autopilot that sends email while you sleep.

It is an **ops team that waits for your yes.**

| Without KrewsAgent | With KrewsAgent |
|------------------|-----------------|
| 47 unread emails after a long day | Ops crew reads inbox + spam, drafts replies |
| Customer issue sitting in GitHub | Support crew drafts a reply; you approve to post |
| "I should post about what I shipped" | Growth crew drafts LinkedIn + outreach; you copy/paste |
| Fear of AI sending the wrong thing | Every action is a card you approve, reject, or edit |

---

## Why we built this

A **friend** and I pitched this idea in a competition. We weren't chosen — we were eliminated. That was the end of the pitch; the idea stuck with me.

The problem is still real: founders stacking a product, a job, and life at home — **no ops team, no EA, no VA** — especially pre-seed, before Series A money, when hiring takes time and life doesn't wait.

**Caregiving** makes the hours tighter. You don't get a clean afternoon to clear inbox, reply to investors, and close support tickets. You get 11pm, tired, with work still waiting.

Most AI tools make that scarier, not easier — they want to *act* without asking.

I didn't want to leave it as slides. **I built KrewsAgent myself** — that early idea turned into something real: a working agent with Gmail, GitHub, TARS, and an approval gate you can demo today.

**KrewsAgent is the crew you can't afford to hire yet** — with one rule: *propose first, execute only when you approve.*

> *"It's 11pm. I just put my mom to bed. 47 unread emails, a customer needing help, an investor follow-up due tomorrow. I open KrewsAgent — by morning, my crew has read everything and drafted what I need. They're waiting for me to say yes."*

---

## Who it's for

- **Solo pre-seed founders** — nights and weekends, no ops team
- **Side-stackers** — product + job + family + something else
- **Caregivers** — limited hours, zero tolerance for AI gone rogue
- **Anyone between "doing it all myself" and "ready to hire"**

Not for: funded teams with dedicated ops, or people who want full autopilot.

---

## How it works (simple)

```
You connect tools  →  You pick a crew  →  AI runs  →  You get cards  →  You decide
```

1. **Connect** Gmail and/or GitHub (or use the demo with sample data).
2. **Choose a crew** — Ops, Growth, Support, or Finance.
3. **Run crew** — the agent reads your workspace and proposes up to 3 actions.
4. **Review cards** — each card is one draft with a clear approve / reject path.
5. **You act** — draft email, send email, post GitHub comment, copy LinkedIn text — only if you said yes.

Every run and every decision goes to an **audit log** you can check on the Activity page.

---

## Your four crews

| Crew | Plain English | Connect |
|------|---------------|---------|
| **Ops** | Triage email (inbox + spam + threads), warn on phishing, draft investor replies | Gmail |
| **Support** | Read GitHub issues + comment history, draft customer replies | GitHub |
| **Growth** | Turn "what I shipped" into LinkedIn + outreach drafts | Just type your update |
| **Finance** | Read-only runway / MRR summary | Nothing |

**On each card you might see:**
- **Ops:** Reject · Draft to Gmail · Send (confirm twice) · Security warnings for sketchy spam
- **Support:** Approve to post a real GitHub comment
- **Growth:** Copy text · Open LinkedIn · Save draft (no auto-post — LinkedIn blocks bots)

---

## Architecture

KrewsAgent is **one agent runtime** with **four specialist crews**. Same pipeline every time — different data source and playbook per crew.

### Agent vs crew

| Term | Meaning |
|------|---------|
| **Agent** | The shared system: read your workspace → reason with AI → propose actions → wait for you |
| **Crew** | A role the agent plays: Ops, Growth, Support, or Finance (`agent_type` in code) |
| **Run** | One pipeline execution for a chosen crew — creates **pending** approval cards only |
| **Approve** | A separate step that may call Gmail, GitHub, etc. — nothing executes without this |

Ops is an **agent crew**, not a separate app. Picking OPS on the dashboard runs `agent_type: "ops"` through the same engine as Support or Growth.

### System overview

```
Browser (Next.js UI)
    │
    ▼
API routes  ──►  middleware (session or demo cookie)
    │
    ├── POST /api/agent/run         →  pipeline  →  pending approvals  (no side effects)
    └── POST /api/approvals/approve  →  approval guard  →  Gmail / GitHub / audit
    │
    ▼
Supabase (users, approvals, integrations, hash-chained action_log)
    │
    ▼
External: TARS · Gmail API · GitHub API
```

### The agent loop

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│  Context    │ →  │  TARS (AI)   │ →  │  Approval   │ →  │  Tools       │
│  Gmail      │    │  classify +  │    │  cards      │    │  (only after │
│  GitHub     │    │  draft       │    │  (pending)  │    │   you approve)│
│  your input │    │              │    │             │    │              │
└─────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                              │
                                              ▼
                                        Audit log (hash-chained)
```

### The 7-stage pipeline

Every crew run goes through `lib/pipeline/runPipeline.ts`:

1. **Context** — Pull data for the active crew (see table below)
2. **Fence** — Wrap Gmail/GitHub text as untrusted input; flag injection patterns
3. **Classify** — TARS triage (skipped in demo mode for speed)
4. **Plan + draft** — TARS drafts up to 3 actions using the crew playbook
5. **Validate** — Allowlist action types; apply server-side risk floors
6. **Approval queue** — Insert `pending` rows in `approvals` — no sends, no posts
7. **Audit** — Hash-chained log entry for the run

Execution is **not** part of this pipeline. Approving a card calls `lib/security/approvalGuard.ts` — the only path that creates Gmail drafts/sends or GitHub comments.

### Two-phase design

```
Phase 1 — RUN                     Phase 2 — APPROVE (you)
─────────────────                 ─────────────────────────
Read inbox / issues               You click Draft / Send / Approve
TARS drafts actions      →        approvalGuard runs
Save pending cards                Side effects happen here (if you said yes)
Zero side effects
```

The run endpoint cannot send email or post to GitHub. Only the approve endpoint can — and send requires a second confirm.

### What each crew reads

| Crew | Context source | On approve |
|------|----------------|------------|
| **Ops** | Gmail threads (inbox + spam + promotions/updates, last 14d) | Gmail draft or send (same thread) |
| **Support** | Open GitHub issues + comment history | Post issue comment |
| **Growth** | Your “what I shipped” textarea | Save draft / copy (no auto-post) |
| **Finance** | Founder context from DB (MRR, runway) | Read-only — no execution |

### Stack

- **Frontend:** Next.js 14 (App Router), React
- **API:** Next.js route handlers + `withSecurity` (auth, rate limits, validation)
- **AI:** [Tetrate TARS](https://router.tetrate.ai) — OpenAI-compatible client, Claude via router
- **Data:** Supabase Postgres
- **Integrations:** Gmail OAuth, GitHub OAuth
- **Deploy:** Vercel

### AI (TARS)

- OpenAI-compatible client → `https://api.router.tetrate.ai/v1`
- Primary: `claude-sonnet-4-6` · classify: `claude-haiku-4-5` · fallbacks: `gpt-4o`, `gemini-2.5-flash`
- `DEMO_MODE` tries live TARS first; cached fallback uses the same approval gate if the router is slow

### Security

| Layer | What it means |
|-------|----------------|
| Approval guard | Only chokepoint for side effects |
| Untrusted fencing | Inbox/issue text treated as data, not instructions |
| Allowlist | Unknown action types dropped |
| Risk floors | Server never lowers danger level |
| Redacted audit | Hash-chained log at `/activity` |
| No training | We don't train models on your workspace |

### Privacy

- Gmail/GitHub read **per run**, not bulk-archived in our DB
- Approval previews + audit persist until you clear data
- Demo mode uses fictional data — real OAuth blocked in placeholder mode

---

## Try it

| Path | Who |
|------|-----|
| **Try the demo** | Quick look — no account, simulated inbox |
| **Sign up + connect** | Your real Gmail, GitHub, drafts, and sends |

---

## For developers

```bash
git clone https://github.com/devchicajas/KrewsAgent
cd KrewsAgent
cp .env.example .env.local
npm install
# Supabase SQL: db/schema.sql then db/auth-migrations-combined.sql
npm run seed && npm run dev
```

| Command | Purpose |
|---------|---------|
| `npm run integrations:check` | Verify OAuth env |
| `npm run account:reset -- email` | Fresh start for a user |
| `npm test` | Security + helper tests |

**Docs:** [Auth](docs/AUTH_SETUP.md) · [Gmail + GitHub](docs/INTEGRATIONS_SETUP.md) · [Buildathon submission](docs/BUILDATHON_SUBMISSION.md)

**Env:** Supabase + `AUTH_SECRET` required. `TARS_API_KEY` + OAuth secrets for full experience. See `.env.example`.

**Deploy:** Vercel → env vars → set `NEXT_PUBLIC_APP_URL` → add Google/GitHub OAuth redirect URLs.

---

## MVP2 — what's next

For founders still between solo and first hire:

- [ ] **Slack / digest** — "3 cards waiting" so you don't have to remember to open the app
- [ ] **Scheduled runs** — Ops at 8am before the day starts
- [ ] **Edit on card** — tweak draft before approve
- [ ] **Founder context UI** — update MRR, runway, investor names without SQL
- [ ] **Stripe read-only** — live Finance crew data
- [ ] **First hire handoff** — export playbooks when you finally bring on a VA

LinkedIn stays copy/paste unless partner API access — bots aren't the goal; *your* voice is.

---

## License

MIT
