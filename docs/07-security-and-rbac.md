# Security and RBAC

Security is part of the platform structure, not a later visual layer.

## Roles

- Owner: full tenant control, billing, users, sites, rules, and audit.
- Admin: manage sites, assets, devices, users, and approved rules.
- Operator: monitor and operate equipment within safety policy.
- Viewer: read-only access.
- Auditor: read-only reports, audit logs, automation history, and compliance evidence.

Orthogonal to all five: `isPlatformAdmin`, a cross-tenant flag held only by Greecon's own staff
(`005_platform_admin.sql`), checked by its own `PlatformAdminGuard` rather than folded into the
role/`Permission` system above. A client's own owner role never implies access to another client's
data — see `docs/13-pilot-readiness.md`, "There was no way to onboard a second client."

## Backend Enforcement

The frontend hides unauthorized actions, but the API enforces RBAC with guards. Tenant isolation is enforced in service methods. Operators can command only within safety policy. Viewers and auditors cannot command.

## Authentication

`POST /auth/login` checks an email/password against `users.password_hash` (bcrypt) and, on
success, issues a signed JWT (`{sub, tenantId, role, email}`, 12h expiry, `JWT_SECRET`). The web
app stores it in an httpOnly session cookie and sends it back as `x-greecon-session` on every API
call; the API's `PrincipalGuard` verifies the signature on every request and builds the caller's
identity from the verified claims — never from anything the client merely asserts.

This deliberately uses a custom header, not the standard `Authorization` one: on GCP, `Authorization`
already carries the Cloud Run service-to-service ID token (infrastructure-level access control,
unrelated to which human is logged in) — reusing it for both would silently break one or the
other depending on deployment target.

A request that presents a token must have it verify, full stop — an invalid or expired token is
rejected outright, never silently downgraded to trusting a header instead. A header
(`x-user-role`/`x-tenant-id`) is trusted when **no token is presented at all**, but only outside
production (`NODE_ENV !== "production"`, unset by both Dockerfiles' local/CI equivalents): the
static GitHub Pages export (which has no server to log in against and bakes in a fixed demo role
per build — `docs/12-deployment-github-pages.md`, built by running the API locally with no public
exposure) and local dev/test convenience. **On a real deployment (Railway, GCP —
`NODE_ENV=production` from both Dockerfiles), this fallback is disabled outright**: a request with
no valid session token gets `401 Unauthorized`, full stop, not a role assigned from whatever it
happened to send. This matters now that the API can have a public domain (below) — an unauthenticated
header from literally anyone on the internet must never grant anything.

**The one exception, scoped tightly:** `POST /telemetry/ingest` also accepts a shared device
secret (`x-edge-device-token`, matched against `EDGE_INGEST_TOKEN`) for a real edge box that has no
user to log in as — see `docs/14-edge-hardware-deployment.md`. This grants a synthetic "operator"
principal for a single fixed tenant (`EDGE_INGEST_TENANT_ID`) and *only* for that one route —
`PrincipalGuard` checks the exact path and method before granting it, so the same header on any
other route falls straight into the production lockout above. Both env vars must be set together;
either one missing disables the path entirely. This is a genuinely simpler, less isolated
credential than the real per-gateway identity `docs/15-master-roadmap.md`'s Phase 2 describes (a
leaked token can inject fake telemetry for one tenant, though never read anything or issue a
command) — an explicit trade-off for a first real pilot with one site, not the end state.

There is no *self-service* password reset flow yet (that needs a real email-sending integration
this deployment doesn't have) — an owner/admin can reset another user's password from the Admin
page instead (`POST /users/:userId/reset-password`), generating a fresh temporary password shown
once, the same one-time-disclosure handling as creating a new user. Every seeded demo account
still shares one password (`003_auth.sql`) — that one's still an open item, tracked in
`docs/15-master-roadmap.md`, Phase 0.

`POST /auth/login` is rate-limited to 8 attempts per minute per caller (the rest of the API to 120
requests per minute per caller as a global default) via `@nestjs/throttler`, in-memory — fine for
the current single-instance deployment, revisit with a shared (Redis) store only once there's more
than one API replica running.

A suspended client (`tenants.status`, set via `/platform-admin`) is enforced twice: `POST
/auth/login` refuses a fresh token for it, and `TenantStatusGuard` rejects every subsequent request
from an already-issued token too — a 12h-valid JWT does not go on working after its tenant is
suspended.

## Manual Override

Manual override requires:

- Reason.
- User identity.
- Timestamp.
- Duration.
- Audit event.
- Safety evaluation.

Manual override does not bypass hard safety rules.

## Secrets

No real secrets are stored in source control. `.env.example` contains local placeholders only. Production secrets belong in Google Secret Manager.

## Gateway Identity

Certificate-based identity and mTLS are planned for gateway provisioning. The schema includes placeholders for secure identity status and mTLS subject metadata.
