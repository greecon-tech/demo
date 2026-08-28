# Security and RBAC

Security is part of the platform structure, not a later visual layer.

## Roles

- Owner: full tenant control, billing, users, sites, rules, and audit.
- Admin: manage sites, assets, devices, users, and approved rules.
- Operator: monitor and operate equipment within safety policy.
- Viewer: read-only access.
- Auditor: read-only reports, audit logs, automation history, and compliance evidence.

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
rejected outright, never silently downgraded to trusting a header instead. The only time a header
(`x-user-role`/`x-tenant-id`) is still trusted is when **no token is presented at all**: the static
GitHub Pages export (which has no server to log in against, and bakes in a fixed demo role per
build — see `docs/12-deployment-github-pages.md`) and local dev/test convenience. This is safe
specifically because the API is never publicly reachable either way (see "Secrets" and
`docs/11-deployment-railway.md`) — real authentication exists so that a real deployment has actual
per-user identity and accountability, not because the header path was otherwise exploitable by an
external caller.

There is no password reset flow yet, and every seeded demo account shares one password
(`003_auth.sql`) — both are tracked as open items in `docs/15-master-roadmap.md`, Phase 0.

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
