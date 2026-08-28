# Master Roadmap — Toward Production-Grade

This is the "what would it actually take" plan across everything the platform needs to stop being
a pilot demo and become a genuinely best-in-class operational platform: reliability, enterprise
readiness, AI-driven optimization, and product polish. It supersedes the narrower scope of
`docs/13-pilot-readiness.md` (which stays as the detailed gap/how-to log for day-to-day work) by
giving that work a sequence and a destination.

**Sequencing principle:** each phase is a real prerequisite for the one after it, not just a
priority label. Security/auth has to exist before "enterprise-grade" means anything. Reliability
has to exist before AI optimization has trustworthy data to learn from. Polish is worth investing
in once the thing underneath it is stable, not before.

## Phase 0 — Foundational security (do this first, everything else depends on it)

The single biggest structural gap in the platform today: **there is no real authentication.**
`apps/web/src/app/login/page.tsx` is a static form with no submit handler. Every request's role
comes from a header (`x-user-role`) that any caller can set to anything, or from a single
build-time `GREECON_DEMO_ROLE` env var for the whole deployment. This was an acceptable MVP
shortcut while the API stayed off the public internet — but it means there is currently no concept
of "this specific person did this specific thing," which undermines the audit trail the platform
already goes to real effort to maintain everywhere else (every command, rule change, and alert
acknowledgement records `requestedBy`/`userId` — from a header no one actually authenticated with).

This phase is being implemented as part of this pass — see `docs/07-security-and-rbac.md` for the
resulting design once it lands, and the "Real authentication" entry in `docs/13-pilot-readiness.md`
for status.

Also in this phase, once real accounts exist:
- **Per-user audit identity** — every audit event, command, and rule change should trace to a real
  logged-in user, not an asserted role.
- **Password reset / invite flow** — there is currently no way to create a new user account at all
  outside seed data; this is the natural follow-on once login itself works.
- **Rate limiting on `/auth/login`** — brute-force protection, trivial to add once the endpoint
  exists (a fixed-window counter keyed by IP + email is enough to start).

## Phase 1 — Pilot reliability

Everything already tracked in `docs/13-pilot-readiness.md`'s "Still open" section belongs here.
Site/device/point provisioning CRUD — the item originally listed first here — is done (API-level;
there's still no admin UI for it, see that doc's entry). What's left:

- Real field protocol drivers (Modbus/OPC-UA) — today only `apps/edge-simulator` exists.
- Per-site configurable safety limits (currently one hardcoded `defaultSafetyLimits` for every
  tenant and site).
- Maintenance task mutation endpoints.
- Edge-to-cloud network reachability for a genuinely remote site (WireGuard/Tailscale tunnel,
  documented in `docs/14-edge-hardware-deployment.md`).
- Durable edge-side buffering (currently in-process memory in `apps/edge-agent`; loses backlog on
  a service restart during a long outage).

A platform is not "reliable" until a real site can run unattended for weeks without an engineer
watching logs. That's the bar for calling this phase done, not "the demo works."

## Phase 2 — Enterprise readiness

What separates "runs your own pilot" from "a utility or agribusiness enterprise can actually buy
and deploy this":

- **Real device identity for machine traffic.** Once Phase 0's user auth exists, the same problem
  remains for gateways: `apps/edge-agent` currently authenticates to the API with the same
  role-header trust model. A provisioned device should carry its own credential (a per-gateway
  signed token or mTLS client certificate, checked against a table of registered gateways) so
  compromising one site's edge box doesn't grant broader access than that site.
- **Tenant-level administration.** Today there's one hardcoded demo tenant. Real multi-tenant
  onboarding (tenant creation, billing status, per-tenant user management UI) needs to exist for
  this to be sellable as a SaaS product rather than a bespoke deployment per customer.
  `tenants.controller.ts` and the schema already model tenants; there's no admin flow to create
  one.
- **Formal audit/compliance posture.** The audit log itself is solid (immutable event trail,
  already dual-written to Postgres). What's missing for a compliance-conscious buyer: retention
  policy, log export in a standard format, and a documented data-handling policy (where telemetry
  lives, how long, who can see it) — mostly a documentation and configuration exercise once the
  underlying audit mechanism (already built) is trustworthy.
- **Secrets management for production.** `docs/07-security-and-rbac.md` already establishes
  secrets belong in Google Secret Manager, not source control — Phase 0 adds `JWT_SECRET` to that
  same discipline. Verify this is actually wired into the GCP/Railway deployment paths, not just
  documented.
- **SLA-grade observability.** Structured logging and metrics/alerting on the API and edge-agent
  themselves (not just the domain data they carry) — right now, if the API process crashes at 3am,
  nothing pages anyone. This is infrastructure work (e.g. a hosted metrics/alerting service), not
  application code, and should be scoped once there's a real pilot to protect.

## Phase 3 — AI-driven optimization

The GAIA rules engine today is threshold-based: a condition crosses a fixed value, an action
fires, evaluated in strict priority order (Safety > Asset Protection > Compliance > Optimization >
Efficiency > Advisory). That hierarchy is the right foundation to build on — it should not change.
What's missing is the "AI" layer on top of that foundation:

- **Forecasting inputs.** Weather/irrigation-demand forecasting feeding the `optimization`/
  `efficiency` tier rules (the "Advisory: reduce irrigation if rain forecast placeholder is true"
  seed rule is exactly this, waiting for a real forecast source). This is the lowest-risk, highest
  near-term-value AI addition: it only ever influences advisory/optimization-tier decisions, never
  safety, so it can be introduced without touching the hard-interlock logic in `packages/gaia-core`
  at all.
- **Adaptive thresholds.** Instead of one fixed `irrigate_below: 28` for every site, learn a
  site-specific baseline from its own historical telemetry (now that `telemetry_readings` actually
  persists full history — see the persistence work already done). This is a model that *proposes*
  a threshold for a human to approve through the existing rule-approval workflow, not one that
  silently changes safety-relevant behavior — keep the human-in-the-loop approval gate that
  `rule_approvals` already provides.
- **Anomaly detection on derived states**, surfaced as alerts rather than automated actions
  initially — lower risk than closed-loop automation, and it directly improves the "advisory" tier
  the priority hierarchy already reserves for exactly this kind of recommendation.

Every item here should land as an **advisory or optimization-tier** contribution first, go through
the same rule-approval and audit pipeline every other rule does, and only be considered for a
higher priority tier after a real pilot has built confidence in it. This is not a place to move
fast — a bad automated irrigation decision costs a farmer a real season.

## Phase 4 — Product polish

Once the phases above are real, the UI is worth investing real design effort in — not before,
since polish on top of fake data and no real login would be polish in the wrong place:

- **Onboarding.** A first-run flow for a new tenant/site, not just seed data.
- **Mobile-first operator views.** A farmer standing at a valve manifold needs Manual Control to
  work well on a phone, not just a desktop dashboard.
- **Real-time updates without a page refresh.** Every page today re-fetches on navigation; a
  WebSocket or SSE channel for live telemetry/alert updates would match what an operator actually
  expects from a monitoring product.
- **Design system depth.** The current brand system (`docs/06-frontend-design-system.md`) is solid
  and should be kept exactly as-is — Greecon's visual identity is not part of what needs rebuilding
  here. What's worth adding is breadth: empty states, loading states, and error states that are
  currently minimal-to-absent across most pages.

## What "keep the brand" means in this plan

None of the above touches Greecon's visual identity, name, or positioning — the IBM Plex Serif
type system, the brand palette, and the Greecon/GAIA naming stay exactly as documented in
`docs/06-frontend-design-system.md` and the GAIA architecture docs. "Rebuild it clean" here means
the engineering underneath gets hardened to match the ambition already implied by the brand — not
that the brand itself changes.
