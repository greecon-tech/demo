# Publishing a demo snapshot to GitHub Pages

This is the fastest path to a link you can put in front of a prospect — not a real deployment. `.github/workflows/pages.yml` builds the API, starts it locally inside the GitHub Actions runner on its built-in seeded demo data (no database, no secrets), then builds a **static export** of the web app: every page is fetched once at build time and baked into plain HTML. Once published, nothing is running — it's a snapshot, not a live system. Nobody can log in, submit a command, or see data change; it's exactly what the seeded demo data looked like at publish time.

For an actual pilot with a live backend, use Railway (`docs/11-deployment-railway.md`) or, later, Google Cloud (`docs/10-deployment-gcp.md`).

## One-time setup

In the repo on GitHub: **Settings → Pages → Build and deployment → Source → GitHub Actions**. That's the only manual step.

## Publishing

Push to `main`, or run the workflow manually from the **Actions** tab → "Publish demo to GitHub Pages" → "Run workflow". The published URL is `https://greecon-tech.github.io/demo/` (shown under Settings → Pages, and as the `deploy` job's environment URL on each run).

## Updating it

Every push to `main` republishes automatically with whatever the seeded demo data looks like at that point — there's nothing to re-run manually.
