# Auth setup (open-source credentials)

KrewsAgent uses **self-hosted email + password auth** — no Supabase Auth, no email SMTP, no rate limits.

| Layer | Tech | Purpose |
|-------|------|---------|
| **Account sign-in** | `bcryptjs` + `jose` (JWT session cookie) | Create account, sign in, sign out |
| **Gmail inbox** | Google OAuth (`/api/integrations/gmail/*`) | Separate — connect after you are signed in |
| **Database** | Supabase Postgres (service role) | Stores users + `password_hash` |

## 1. Environment

Add to `.env.local`:

```bash
# 32+ random characters — e.g. openssl rand -base64 32
AUTH_SECRET=your_long_random_secret_here
```

Generate one:

```bash
openssl rand -base64 32
```

## 2. Database migration (required)

In **Supabase → SQL Editor**, paste and run **`db/auth-migrations-combined.sql`** once.

This adds `password_hash` and the forgot-password tokens table. Without it, sign-up/sign-in will fail.

For a fresh project, run `db/schema.sql` first, then the combined file.

## 2b. Forgot password (optional Resend)

Sign-in does not need email. **Password reset does.**

```bash
# Free tier: https://resend.com (3,000 emails/month)
RESEND_API_KEY=re_...
AUTH_EMAIL_FROM=KrewsAgent <onboarding@resend.dev>
```

Without `RESEND_API_KEY`, the reset link is shown on `/login/forgot` and logged to the server console.

**Resend test mode:** with `onboarding@resend.dev`, emails only deliver to the address you used to sign up for Resend. Other recipients get the reset link on-screen instead. For any email address, verify a domain at [resend.com/domains](https://resend.com/domains) and update `AUTH_EMAIL_FROM`.

Flow: `/login` → **Forgot password?** → email → `/login/reset?token=...` → new password → signed in.

## 3. Gmail (separate from auth)

Gmail OAuth is **not** used for signing in. After account sign-in:

1. Go to `/connect`
2. **Connect Gmail** — uses `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
3. Redirect URI: `http://localhost:3000/api/integrations/gmail/callback`

Configure in **Google Cloud Console** only — not Supabase Auth providers.

## 4. Test flow

1. `npm run dev`
2. `/login` → **Create Account** (name + email + password)
3. Redirects to `/connect` — no confirmation email
4. **Connect Gmail** → authorize inbox access
5. **Dashboard** → Run OPS crew on live inbox

## Demo vs signed-in

| Path | Session | Gmail |
|------|---------|-------|
| TRY DEMO | `krews_demo` cookie | Demo inbox only |
| Sign up / Sign in | `krews_session` JWT cookie | Live inbox when Gmail connected |

## Migrating from Supabase Auth

Old Supabase Auth users do not have `password_hash` in `users`. Create a new account with the same email (or delete the old row in Supabase dashboard first).
