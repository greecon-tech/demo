# Deployment on Railway (pilot)

Railway hosts the initial pilot: it deploys straight from GitHub using the existing Dockerfiles, with no Terraform, no Workload Identity Federation, and no separate CLI setup. Google Cloud (`docs/10-deployment-gcp.md`) remains the target for later, once the pilot outgrows this.

## Network boundary

Same principle as the GCP path: the API service must **not** get a public domain. It's only reachable over Railway's private network, and only the web service calls it — the API's RBAC trusts a self-asserted `x-user-role` header (see `docs/07-security-and-rbac.md`), so a publicly reachable API would let anyone set that header themselves.

## One-time setup, in the Railway dashboard

1. Sign in to [railway.app](https://railway.app) with GitHub, then **New Project → Deploy from GitHub repo** → select `greecon-tech/demo` and the branch to deploy.
2. Add Postgres: in the project, **+ New → Database → Add PostgreSQL**. Railway provisions it and exposes `DATABASE_URL` automatically as a variable on that service — TimescaleDB isn't available here either, and the migrations already handle that (see `docs/10-deployment-gcp.md`).
3. Configure the service Railway created from the repo to be the **API**:
   - Settings → Build → Dockerfile Path: `infra/docker/api.Dockerfile`
   - Settings → Networking → do **not** enable a public domain.
   - Variables: add `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (Railway's variable-reference syntax — type it literally, it resolves the other service's value).
4. Add a second service for the **web app**: **+ New → GitHub Repo**, same repo/branch.
   - Settings → Build → Dockerfile Path: `infra/docker/web.Dockerfile`
   - Settings → Networking → **enable** a public domain (this is the pilot URL).
   - Variables: add `GREECON_API_URL` = `http://${{api.RAILWAY_PRIVATE_DOMAIN}}:4000` — replace `api` with whatever you named the API service if you renamed it.
   - Variables: add `GREECON_DEMO_ROLE` = `owner` so the deployed site can manage automation rules (see "Managing rules" below). There's still no real per-user login (see `docs/07-security-and-rbac.md`), so this grants owner-level access to anyone who reaches the URL — acceptable for a single-operator pilot, not for a public site.
5. Both services redeploy automatically on every push to the connected branch from here on.

## Load the database schema (one time)

Install the Railway CLI and link it to this project from a terminal (Cloud Shell works fine for this too):

```bash
npm install -g @railway/cli
railway login
railway link            # pick this project when prompted
npm install
npm run build -w @greecon/api
railway run --service api npm run db:migrate -w @greecon/api
```

`railway run` injects that service's real environment (including `DATABASE_URL`) into the command without ever exposing the database publicly.

## Getting the pilot URL

Settings → Networking on the web service shows the generated `*.up.railway.app` domain (or attach a custom domain there, e.g. a `greecon.earth` subdomain).

## Managing rules

The Automation page's rule editor (create, approve, disable, delete) only works here — the static GitHub Pages demo has no server to save changes to. Rules persist in Postgres once `DATABASE_URL` is set and the migration above has run; without it, the API falls back to the same in-memory seed data as the static demo, and edits are lost on restart.
