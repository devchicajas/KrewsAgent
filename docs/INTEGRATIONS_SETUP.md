# Gmail + GitHub OAuth setup

Gmail and GitHub are **separate connections**. Your KrewsAgent login email can differ from both.

| Integration | Account you authorize | Purpose |
|-------------|----------------------|---------|
| **Gmail** | Your Google/Gmail account | Ops inbox + spam/tabs · draft or send on approve |
| **GitHub** | Your GitHub account | Support issues + comment on approve |

---

## 1. Gmail OAuth (Google Cloud)

1. [console.cloud.google.com](https://console.cloud.google.com) → enable **Gmail API**
2. **OAuth consent screen** → External → add test users (your Gmail)
3. **Credentials → OAuth client ID → Web application**
4. **Redirect URI:** `http://localhost:3000/api/integrations/gmail/callback`

```bash
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/gmail/callback
```

**Test:** Sign in → `/connect` → **CONNECT GMAIL** → Dashboard → OPS crew → on an email card: **DRAFT** (Gmail Drafts) or **SEND** (confirm twice).

---

## 2. GitHub OAuth (GitHub Settings)

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**
2. **Homepage URL:** `http://localhost:3000`
3. **Authorization callback URL:** `http://localhost:3000/api/integrations/github/callback`
4. Copy **Client ID** and generate **Client Secret**

```bash
GITHUB_CLIENT_ID=Ov23li...
GITHUB_CLIENT_SECRET=...
GITHUB_REDIRECT_URI=http://localhost:3000/api/integrations/github/callback

# Issues repo for Support crew (public demo repo)
GITHUB_OWNER=demoprojectz56t-max
GITHUB_REPO=concept-to-code-dash
```

**Test:** Sign in → `/connect` → **CONNECT GITHUB** → **choose your repo** from the dropdown → **SAVE REPO CHOICE** → Dashboard → SUPPORT crew → approve support reply → comment on your repo's issue.

Each user picks **their own repo** (stored in `integrations.payload`). Env `GITHUB_OWNER`/`GITHUB_REPO` is only the default suggestion until a user saves a choice.

---

## 3. Demo script (judges)

1. **Sign in** to KrewsAgent (any email/password)
2. **Connect Gmail** → authorize with Google account A
3. **Connect GitHub** → authorize with GitHub account B (different is fine)
4. **OPS crew** → live inbox (or demo if empty)
5. Approve **draft email** → check Gmail drafts
6. **SUPPORT crew** → live issues from ForkPath repo
7. Approve **support reply** → check GitHub issue comment

---

## Verify

```bash
npm run integrations:check
```

Restart after changing `.env.local`:

```bash
npm run build && npm start
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No CONNECT buttons | Set OAuth client IDs/secrets, restart server |
| `?gmail=error` | Google redirect URI mismatch |
| `?github=error` | GitHub callback URL mismatch |
| GitHub comment fails 403 | Repo must be public, or your GitHub user needs access |
| Different accounts | Expected — Gmail OAuth ≠ GitHub OAuth ≠ KrewsAgent login |
