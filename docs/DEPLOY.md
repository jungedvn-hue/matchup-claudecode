# Deploy Guide — MatchUp

## TL;DR

| Target           | URL                  | Host             | How deploy                     |
|------------------|----------------------|------------------|--------------------------------|
| Web app          | `app.matchup.asia`   | Vercel           | Auto on `git push origin main` |
| Landing page     | `matchup.asia`       | Cloudflare Pages | **Manual** via Wrangler CLI    |

---

## Landing page — `matchup.asia` (Cloudflare Pages)

⚠️ **Project `matchup-landing` is NOT connected to Git** (Direct Upload mode).
Pushing to GitHub does **not** trigger a rebuild. You must deploy manually.

### One-shot deploy command

```bash
cd "<repo-root>"
export CLOUDFLARE_API_TOKEN="<token>"
export CLOUDFLARE_ACCOUNT_ID="232ce0d1df4a35b95777a54596310412"

npx --yes wrangler@latest pages deploy landing \
  --project-name=matchup-landing \
  --branch=main \
  --commit-dirty=true
```

Expected output ends with:
```
✨ Deployment complete! Take a peek over at https://<hash>.matchup-landing.pages.dev
```

### Verify it's live

```bash
curl -s "https://matchup.asia/?cb=$(date +%s)" | grep "<h1>"
```

The HTML at `matchup.asia` should match the source in `landing/index.html` within seconds (no CDN cache lag — `cf-cache-status: DYNAMIC`).

### Getting a Cloudflare API token

1. Cloudflare → **My Profile → API Tokens → Create Token**
2. Template: **Edit Cloudflare Workers** (includes `Cloudflare Pages → Edit`)
3. Account Resources: **Specific account** → `Jun.gedvn@gmail.com's Account`
4. TTL: set 1 day (delete after use)
5. Copy the token (shown once)
6. After deploy → **Roll** or **Delete** the token

### Cloudflare account / project IDs

- Account ID: `232ce0d1df4a35b95777a54596310412`
- Pages project: `matchup-landing`
- Bound domains: `matchup-landing.pages.dev`, `matchup.asia`

### Recommended future fix: connect Git auto-deploy

Cloudflare → Pages → `matchup-landing` → **Settings → Builds & deployments → Connect to Git**:
- Repo: `jungedvn-hue/matchup-claudecode`
- Production branch: `main`
- Build command: *(leave empty)*
- Build output directory: `landing`

After this, `git push origin main` will auto-trigger landing deploys.

---

## Web app — `app.matchup.asia` (Vercel)

Auto-deploys on push to `main`. Build config in `vercel.json`. No manual step.

```bash
git push origin main
# → Vercel picks up commit, builds Vite + serves /index.html
```
