# Pilot Readiness — Gaps and How-To Fixes

This is a running audit of the platform against what a real pilot deployment needs, in the
"what's the gap, and how do we close it" format. Items are grouped by status: fixed this pass,
and still open with a concrete next step. Update this file as gaps are closed or new ones are
found — it is meant to stay current, not be a one-time snapshot.

## Fixed in this pass

### No real field protocol drivers existed

**Gap:** `apps/edge-simulator` publishes synthetic sine-wave readings. Nothing in the repo
actually read a Modbus, OPC-UA, or analog field device — the `protocol` field on `Device` modeled
these as first-class concepts, but no driver implemented any of them. Without this, nothing a
pilot site actually plugs in could ever reach the platform.

**Fix:** `apps/edge-driver-modbus` — a real Modbus TCP client that polls configured holding/input
registers, decodes `uint16`/`int16`/`float32` values (with an optional scale factor for raw counts
→ engineering units), and publishes the exact same `TelemetryMessage` JSON shape/topic
`apps/edge-simulator` uses. `apps/edge-agent` bridges it to the cloud unchanged — no code needed
to change there, exactly as promised when the bridge was built. See `docs/16-modbus-driver.md` for
the config format and current limitations (no write support yet, no stale-data detection, fixed
big-endian byte order, TCP only — no RTU/serial).

**Verified against a real Modbus TCP server** (not a mock) — `modbus-serial`'s own `ServerTCP`
backing a simulated pump station PLC with a scaled `uint16` pressure register and a `float32` flow
register spanning two registers, both drifting over time. Confirmed the driver correctly decoded
both and, through the existing edge-agent bridge and a real running API, watched the actual
decoded values land in `telemetry_readings` in Postgres, changing on every poll cycle in step with
the simulated device's registers — a genuine protocol conversation end to end, not synthetic data.

### Irrigation and pump safety limits were not admin-configurable per site

**Gap:** `defaultSafetyLimits` in `packages/gaia-core` (max pressure, dry-run flow threshold, pump
runtime/rest, irrigation run cap) was one fixed object applied to every site and tenant. A real
pilot with sites that have genuinely different physical limits (different pipe ratings, different
crop/irrigation zone sizes) would either have automation falsely blocked by a limit too tight for
its equipment, or — worse — a limit too loose to actually protect it.

**Fix:** `sites.safety_limits` (jsonb, `004_site_safety_limits.sql`) holds a per-site partial
override of any subset of the five `SafetyLimits` fields, set via `PATCH /sites/:id`. A site with
no override, or one that only overrides some fields, still gets `defaultSafetyLimits` for
everything else — `evaluateCommandSafety` is called with `{...defaultSafetyLimits,
...site.safetyLimits}`, not the site's override alone. `Site.safetyLimits` (in `packages/shared`)
deliberately duplicates gaia-core's `SafetyLimits` shape field-for-field rather than importing it,
since `shared` shouldn't depend on `gaia-core`.

**Verified against real Postgres**: tightened a site's `maxPressureBar` down to 1 bar against its
seeded 2.8 bar pressure reading and confirmed a pump command that would otherwise dispatch is now
correctly blocked with `"Water pressure 2.70 bar exceeds limit 1.00 bar"`; reset it and confirmed
the command dispatches again; confirmed the override (and its later reset back to no override)
both survive an API restart.

### Maintenance tasks had no mutation endpoints

**Gap:** `maintenanceTasks` was deliberately `readonly` in `PlatformService` — there was a `GET`
but no way to create, update, or close a maintenance task.

**Fix:** `POST /maintenance` and `PATCH /maintenance/:id`, gated on `maintenance:manage`
(owner/admin/operator), following the same dual-write/hydration pattern as everything else.
Setting `status: "complete"` stamps `completedAtUtc` server-side automatically; moving a task back
to `"open"` clears it. Verified live: created a task, marked it complete with a completion log,
and confirmed both the status and the timestamp survive an API restart.

### Site/device/point provisioning had no CRUD

**Gap:** Sites, assets, devices, and points were fixed, hardcoded seed arrays regardless of
whether a database was configured — there were no create/update/delete endpoints for any of them.
Rules, telemetry, commands, alerts, incidents, audit events, edge-sync batches, and report exports
were all fully persisted (see `docs/11-deployment-railway.md`); this layer wasn't. Onboarding a
real pilot site meant editing seed data in source, not an actual provisioning flow.

**Fix:** full `POST/PATCH/DELETE` for `sites`, `assets`, `devices`, and `points`, following the
exact pattern already proven for rules — DTOs with `class-validator` decorators,
`site:manage`/`asset:manage`/`device:manage` permission guards (points fall under `device:manage`;
there's no separate `point:manage` permission), dual-write to the in-memory arrays and (when
`DatabaseService.isConfigured()`) to Postgres, and hydration in `onModuleInit()` — all four now
survive a restart exactly like rules do. Deleting a site is blocked outright while it still has
any registered devices, since the schema cascades a site delete through assets, devices, points,
and telemetry history — that much silent data loss as a side effect of one call is worth refusing
rather than just documenting. Device create/update also accept the `positionX`/`positionY`/
`placementNote` fields added for the sensor map (see that entry below), storing them in the
existing `devices.metadata` jsonb column — closing the "positions don't survive a restart" gap
that fix had explicitly flagged as a follow-up.

**Found and fixed a real bug while verifying this against real Postgres** (not caught by the unit
tests, which run against an unconfigured database and never touch a real foreign key):
`deleteSite` recorded its own `site.deleted` audit event *after* issuing `DELETE FROM sites` —
but `audit_events.site_id` has a foreign key to `sites`, so inserting an audit row that references
the very site that had just been deleted failed with a constraint violation. Worse, because each
query auto-commits independently (there's no transaction wrapping the two statements), the site
was already gone from the database by the time that error surfaced — the API reported a 500 for
an operation that had, in fact, already succeeded, leaving in-memory and database state
inconsistent until the next restart re-hydrated and the site simply vanished. Fixed by recording
the audit event *before* the delete, so the foreign key is satisfied at insert time and
`ON DELETE SET NULL` does what it's actually for: the historical record survives with `site_id`
nulled out, exactly as it does for a rule, asset, device, or point deletion (none of which had
this problem, since none of them reference their own row as the audit event's site).

**Update:** the Admin page (`/admin`) now has a real "Create site" form wired to this API — see
"There was no way to create a real user or site without a console command" below. Device/asset/
point provisioning still has no dedicated form yet (only the API); site creation was prioritized
first since it's the one every new pilot onboarding needs immediately.

### There was no real authentication at all

**Gap:** `apps/web/src/app/login/page.tsx` was a static form with no submit handler at all — the
"Continue" button did nothing. Every request's identity came from a self-asserted `x-user-role`
header, or a single build-time `GREECON_DEMO_ROLE` for the whole deployment. There was no concept
of "this specific person did this specific thing," even though every command, rule change, and
alert acknowledgement already records a `requestedBy`/`userId` — from an identity no one had
actually logged in as.

**Fix:** real login (`docs/07-security-and-rbac.md` has the full design). `POST /auth/login`
checks a bcrypt password hash and issues a signed JWT; the web app stores it in an httpOnly
session cookie and forwards it as `x-greecon-session` on every API call; the API's
`PrincipalGuard` verifies it on every single request and only falls back to the old header-based
identity when no token is presented at all (the static export, which has no server to log in
against, and local dev). A bad or expired token is rejected outright, never silently downgraded to
the header path. Middleware redirects an unauthenticated visitor to `/login`. Five demo
accounts — one per role — were seeded (`003_auth.sql`) so every role can actually log in and be
verified, not just asserted.

This also surfaced a real bug: several pages (`automation`, `alerts`, `admin`, `audit`, `reports`)
used to pin their API calls to a specific role string (e.g. always fetch `/audit` "as auditor")
purely as a workaround for the old single-role-per-build model. Under real per-user sessions that
workaround is actively wrong — a real operator's session can't be waved through as "auditor" for
one call. Fixed by using the real session's role everywhere live, gating the few sections that
need a permission the page itself doesn't require (Automation History needs `audit:read`,
Alerts' Incidents needs `incident:manage`) with the same `hasPermission` pattern already used for
Manual Control, and adding actual server-side enforcement (`lib/access.ts`'s `requirePermission`,
a 404 rather than just hiding the nav link) to the four pages gated by a page-level permission —
previously a role that couldn't see a link in the sidebar could still reach that page's data by
typing the URL directly.

**How to extend further:** there is no password reset flow and no rate limiting on
`POST /auth/login` yet (`docs/15-master-roadmap.md`, Phase 0) — both are real gaps for anything
beyond a demo/pilot. Every seeded demo account also shares one password; see the warning in
`docs/11-deployment-railway.md` about changing this before any real deployment.

### Nothing bridged the edge MQTT broker to the cloud API

**Gap:** `docs/04-edge-runtime.md` describes telemetry flowing over MQTT topics
(`greecon/{tenantId}/{siteId}/telemetry/{deviceId}`), and `apps/edge-simulator` really does
publish there — but nothing in the stack subscribed to that broker. The API only exposes
`POST /telemetry/ingest` over HTTP. A gateway publishing telemetry on-site had no path to the
dashboard at all; this was only found while preparing an actual industrial-PC deployment.

**Fix:** added `apps/edge-agent`, a small bridge that subscribes to the site's telemetry topic on
the local broker and forwards each message to `POST /telemetry/ingest`, buffering in memory and
retrying if the API is briefly unreachable (same `OfflineBuffer` pattern the simulator already
used for its own MQTT reconnects). Verified live end-to-end: Mosquitto + the simulator + the new
agent + the real API against real Postgres, confirmed fresh readings landing in
`telemetry_readings` on a ~5-second cadence. See `docs/14-edge-hardware-deployment.md` for the
full install.

**How to extend further:** the buffer is in-process memory only — a service restart during a long
outage loses whatever hadn't flushed. If a pilot site has unreliable backhaul, the buffer should
move to an on-disk queue (SQLite is the natural fit given nothing else on this box needs a real
database).

### Energy metering was solar/battery-only

**Gap:** `overview()` only ever reported `solarPowerKw`, `batterySocPercent`, and a derived
surplus flag. There was no concept of grid import, grid export, or total consumption anywhere in
the API or seed data, and canonical points for them (`energy.grid.import.kw`,
`energy.grid.export.kw`, `energy.consumption.kw`) existed in `packages/shared` but were never
attached to a device or point. A site with no battery had nothing meaningful to show at all.

**Fix:** `PlatformService.overview()` now reports every `energy.*` field independently
(`packages/api/src/platform/platform.service.ts`), each `undefined` when a tenant's sites don't
meter it rather than assuming a fixed set of equipment. A "Grid Meter" device and its three grid
points were added to Integrated Farm Site — deliberately the one site with **no battery** — to
prove grid metrics are wired up independently of battery presence. The Overview page
(`apps/web/src/app/page.tsx`) only renders a metric card for fields that are actually present, so
customizing per-deployment equipment (solar-only, grid-only, battery-only, or any mix) just works
without code changes on the frontend.

**How to extend further:** to add metering for a new site, add a device + point(s) using the
existing `energy.*` canonical names (or a new one added to `canonicalPoints` in
`packages/shared/src/index.ts`) and seed a telemetry reading. No API or UI code needs to change —
`overview()` and the site detail page both already read generically off whatever points exist.

### Sensor map showed a computed layout, not real placement

**Gap:** `SensorMap.tsx` arranged devices in an auto-generated grid with no relationship to where
sensors actually sit on the land — useful as a diagram, but not a real site map.

**Fix:** `Device` gained optional `positionX`/`positionY` (percentage coordinates within the map
area) and `placementNote` fields (`packages/shared/src/index.ts`). Every demo device now carries
a real surveyed-style position (e.g. the Irrigation Controller sits at the Irrigation Zone 1 valve
manifold, the Grid Meter at the site's utility interconnection point). `SensorMap.tsx` uses these
coordinates when present and only falls back to the generated grid for a device that has no
recorded position, so a newly-added, not-yet-surveyed device still shows up rather than being
dropped.

**Update:** this is now durable — see "Site/device/point provisioning had no CRUD" above, which
added device persistence (including `positionX`/`positionY`/`placementNote` in the
`devices.metadata` jsonb column) and hydration on boot. In production this data would still come
from a site commissioning/survey step (GPS or as-built drawing coordinates converted to
percentages of the site boundary) rather than being hand-typed, but it now at least survives a
restart once entered.

### Farm irrigation had no manual control at all

**Gap:** Two separate problems compounded here. First, `agri.irrigation.command` was referenced
by name in a seeded automation rule but had **no backing point** anywhere — the rule targeted a
canonical name that didn't exist on any device, so it could never actually run even if promoted
out of simulation. Second, `ManualOverridePanel.tsx` was entirely cosmetic: it had no `fetch` or
API call of any kind, just local React state that always claimed success.

**Fix:**
- Added the missing `agri.irrigation.command` point (capability `write`) to the Irrigation
  Controller device on Integrated Farm Site, so the existing "Irrigate when soil moisture is low"
  rule has a real target.
- Replaced the fake panel with `ManualControlPanel.tsx`, which dispatches a real command through
  `POST /commands` (`apps/web/src/lib/actions/commands.ts`, a Server Action) — the exact same
  endpoint and GAIA safety evaluation an automated rule action uses. It is available in two
  places: on each site's detail page, scoped to that site's write-capable points (irrigation,
  pump, etc.), and on the Automation page, listing every write-capable point tenant-wide. Both are
  gated behind the `command:create` permission (owner/admin/operator, not viewer/auditor).
  Automatic (rule/AI) execution stays the default mode; manual dispatch is the explicit,
  confirmation-gated path — the UI states this directly ("Automatic (rules/AI) is the default
  mode").
- Found and fixed a live safety-evaluation bug while testing this end-to-end:
  `requiredSensorPointsForCommand` in `packages/gaia-core/src/index.ts` required a
  `water.pressure.bar` reading before allowing *any* irrigation command — copied from the pump
  station's requirements, but irrigation zones aren't on the same pressurized main and the farm
  site has no pressure sensor at all, so every irrigation command was unconditionally blocked.
  Removed that requirement (soil moisture is still required and quality-gated) and added a
  dedicated single-run duration cap (`maxIrrigationRunMinutes`, default 120) so a manual override
  can't request an unreasonably long run.

**How to extend further:** the duration cap only bounds a single dispatch. It does not yet track
"starts per day" or cumulative daily runtime the way the pump station's rest-time check does for
pumps — that needs a small amount of state (recent command history per point) that
`evaluateCommandSafety` doesn't currently have access to. The straightforward way to add it:
extend `SafetyContext` with a `recentCommands` list (mirroring how `lastPumpStoppedAtUtc` is
threaded through today) and add a check parallel to the pump's rest-time logic.

### There was no way to create a real user or site without a console command

**Gap:** the only way to onboard a real pilot user or a real site was a direct database console
command (bcrypt-hashing a password by hand, inserting rows) — not something the platform's owner
could do themselves. `listUsers()` in `PlatformService` also never read from Postgres at all; it
returned a hardcoded five-user demo array regardless of what was actually in the `users` table, so
even a user created by hand in the database wouldn't show up in the Admin page.

**Fix:**
- `PlatformService` now hydrates `users` from Postgres on boot (joined with `memberships` for
  role), the same dual-write pattern as sites/assets/devices/points.
- `POST /users` (`user:manage`) creates a real user: generates a random temporary password,
  bcrypt-hashes it, inserts the `users` + `memberships` rows, and returns the plaintext password
  exactly once in the response — it is never stored or logged anywhere else, matching the same
  one-time-disclosure handling used for every temporary password issued by hand so far.
- `PATCH /users/:userId` (`user:manage`) changes a user's role or active/disabled status. An owner
  or admin cannot disable their own account or change their own role through this endpoint — both
  throw `ForbiddenException` — so a tenant can't accidentally lock itself out.
- The Admin page (`/admin`) now has a "Create user" form (shows the generated password once, in a
  clearly-labeled one-time notice) and a "Create site" form, plus an inline role selector and
  enable/disable button per row in the Users table. All of it uses real Server Actions against the
  live API — no more console commands for routine onboarding.
- The static GitHub Pages export gets a `page.static.tsx` twin (read-only, no forms) since Server
  Actions can't exist in that build at all — same swap mechanism `build-static.sh` already used for
  the login page, Shell, and manual control.

**Verified:** 4 new `PlatformService` unit tests (viewer blocked from creating a user, full
create → promote-role → disable lifecycle, duplicate-email rejected, self-disable blocked) plus a
full `next build` of both the SSR and static-export paths.

**How to extend further:** device/asset/point provisioning still has no dedicated form (API only,
per the entry above). There is still no password reset flow (`docs/15-master-roadmap.md`, Phase
0) — a disabled-then-re-enabled user keeps their old password, and a user who forgets their
password has no self-service way to get a new one; an admin currently has to create a fresh
temporary password for them by hand through a future "reset password" action on this same page
(not yet built).

### There was no way to onboard a second client — only one hardcoded tenant existed

**Gap:** the entire platform ran against a single hardcoded demo tenant (`DEMO_TENANT_ID`). The
`Admin` page and everything in it (users, sites) is correctly scoped to the caller's own tenant —
that isolation was already real — but there was no way to create a *second*, separate client
account at all, hardcoded or otherwise. `tenants.controller.ts` only ever listed the caller's own
tenant. This mattered the moment "the platform" stopped meaning "our one pilot farm" and started
meaning "a product other clients will also run on."

**Fix:** a new `isPlatformAdmin` flag on `users` (migration `005_platform_admin.sql`), deliberately
kept separate from the tenant-scoped `role`/`Permission` system everything else in
`docs/07-security-and-rbac.md` uses — a client's own owner role must never imply access to another
client's data, so this is a second, orthogonal axis, checked by its own `PlatformAdminGuard`
rather than folded into `hasPermission`. It rides in the same signed JWT as everything else
(`isPlatformAdmin` claim), so it's tamper-proof the same way the rest of a session is. Only
`eridon.manuka@greecon.earth` has it set, by the migration itself.

- `POST /platform-admin/tenants` creates a brand new tenant plus its first owner user in one step
  — same one-time-password handling as `POST /users` — fully isolated from every other tenant's
  data (separate `tenant_id` on every row from the start).
- `GET /platform-admin/tenants` lists every client with live user/site counts, for a platform
  admin only.
- `/platform` in the web app is the real screen for this: an "Onboard a new client" form and a
  table of every client. It only appears in the sidebar (and only actually renders instead of a
  404) for a session with `isPlatformAdmin: true` — everyone else, including a client's own owner,
  never sees it exists.

**Verified:** 3 new `PlatformService` unit tests (non-platform-admin owner blocked from both
listing and creating tenants; a platform admin can onboard a new client whose data stays
completely invisible to `listUsers()` called with the original demo tenant's own principal;
duplicate domain rejected) — 32 tests passing total — plus a full `next build` of both the SSR and
static-export paths.

**How to extend further:** there's no billing/plan status per client yet (`status` is just
`active`/`suspended` with nothing wired to actually suspend one), and no way to remove/deactivate
platform-admin status from the UI — both would need a "danger zone" section on `/platform` once
there's a second real client to actually manage.

### A pass through what "for real, not a demo" was still missing

Requested explicitly once real clients started being onboardable: an expert audit of what a
production system needs that a demo doesn't, focused on what's concretely buildable without a new
external account/integration.

**Gap 1 — nothing rate-limited `/auth/login`.** Anyone (or anything relaying through the public
web app's login form) could attempt unlimited password guesses against any known email.

**Fix:** `@nestjs/throttler`, wired globally (120 requests/minute/caller as a sane default across
the whole API) and tightened hard on `POST /auth/login` specifically (8/minute/caller). In-memory
storage — correct for the current single-instance deployment; would need a Redis-backed storage
adapter (`@nestjs/throttler` supports one) the moment there's more than one API replica, since each
replica would otherwise count independently.

**Gap 2 — suspending a client did nothing.** The `/platform` "Suspend" button and
`tenants.status` column existed (see the entry above) but nothing anywhere actually checked the
value. A suspended client's users could keep working right up until their JWT's own 12h expiry,
and even then could just log in again since login never checked tenant status either.

**Fix:** `POST /auth/login`'s query now joins `tenants` and refuses a fresh token for anything but
an `active` tenant; a new `TenantStatusGuard` (global, running after `PrincipalGuard`) rejects every
other request from an already-issued token the moment its tenant is suspended, not just new logins.
Platform admins are exempt from both checks — their own account lives in Greecon's internal tenant,
which suspension is never aimed at.

**Gap 3 — no way to recover a forgotten password.** There's still no self-service "forgot
password" — that needs a real email-sending integration (a provider account, a verified sending
domain) this deployment doesn't have, and standing one up wasn't something to do silently without
asking. The concrete, buildable stopgap: `POST /users/:userId/reset-password` (Admin page only,
`user:manage`) generates a fresh temporary password on the spot, shown once, same handling as
creating a new user — an admin can now unblock a locked-out teammate in seconds instead of a
console command.

**Gap 4 — a misconfigured production deploy would fail silently.** If `DATABASE_URL` was set (a
real deployment) but `JWT_SECRET` wasn't, the API would start up looking completely healthy and
only reveal the problem the moment someone actually tried to log in — which, for a fresh
deployment right before a demo or a pilot's first real day, is a bad time to discover it.

**Fix:** a startup warning in `main.ts` logs loudly (not a hard crash — a real database with no
`JWT_SECRET` yet is still a valid state mid-setup) the moment that specific combination is
detected, so it shows up in Railway/GCP deploy logs immediately.

**Verified:** 6 new tests (`TenantStatusGuard` unit tests for active/suspended/platform-admin-exempt;
`PlatformService` tests for suspend → reactivate lifecycle and the non-platform-admin block;
password-reset generates a real usable temporary password and is blocked for a viewer) — 37 tests
passing total — plus full `tsc`/`next build` passes for both apps.

**What this pass deliberately did NOT do, and why — these need a decision, not just code:**
- **Real email delivery** (invite emails, password reset emails, alert notifications). Requires
  picking and paying for a transactional email provider (Resend, Postmark, SES) and verifying a
  sending domain — a real account/cost decision, not something to wire up unasked.
- **Error monitoring / uptime alerting** (e.g. Sentry, a status-page ping). Same reasoning: needs a
  third-party account. Worth doing before real client traffic depends on this running unattended —
  see Phase 2's "SLA-grade observability" in `docs/15-master-roadmap.md`.
- **Database backups.** Depends entirely on the Railway/GCP plan and settings, not application
  code — confirm automatic backups are actually enabled on whichever Postgres is in production use
  today, since this can't be verified or fixed from inside the repo.
- **Terms of Service / Privacy Policy / a data-processing agreement for clients.** Once this
  platform holds other companies' operational data, a real legal document (reviewed by an actual
  lawyer, not drafted here) covering data ownership, retention, and liability is worth having before
  onboarding a paying client. Flagged, not drafted — this isn't an engineering gap to close in code.
- `npm audit` currently reports 10 known vulnerabilities across transitive dependencies (vitest's
  dev-only mocker, `body-parser`/`qs`/`js-yaml` pulled in by Express/Swagger, `multer` pulled in by
  `@nestjs/platform-express` despite no file-upload endpoint existing anywhere in this API). None
  are in a code path this app actually exercises (no YAML parsing of untrusted input, no file
  uploads), so none were patched blind this pass — `npm audit fix` hit an unrelated npm workspace
  bug when attempted; worth a dedicated look with a working npm version rather than a rushed
  workaround.

### There was no real visibility into any resource over time, and Analytics was 100% fake

**Gap:** the Overview and Monitoring pages only ever showed the single latest reading per point —
no way to see whether solar production was trending up, how much energy was actually going to the
grid versus being consumed on-site, or whether a tank was draining faster than usual. Worse,
`/analytics` didn't even try: every number on it (`"Energy self-use: 82%"`, `"Water efficiency:
74%"`) was a hardcoded literal, unconnected to any real reading, and the "24 hours / 7 days / 30
days / Quarter" tabs were plain `<span>`s that did nothing.

**Fix:** `GET /telemetry/history?siteId=&hours=` (`PlatformService.telemetryHistory`) queries
`telemetry_readings` directly from Postgres for a real time window, instead of the in-memory
snapshot every other telemetry read uses (which only ever holds the latest value per point by
design). `/analytics` is rebuilt around it: a real chart per metric — solar production,
consumption, grid import, grid export, and battery state of charge for Energy; tank level, flow,
and pressure for Water; soil moisture, temperature, and humidity for Agriculture — so "how much is
being produced vs. how much is going to the grid" is finally an actual answer, not a guess from
two separate numbers. The time-range and site tabs are now real links that change what's queried.
Charts are a small hand-rolled SVG line component (`TimeSeriesChart`), not a new charting library
dependency — consistent with `SensorMap`'s existing hand-rolled approach.

**Verified:** 2 new `PlatformService` tests (no-database fallback returns the latest snapshot;
cross-tenant site history blocked) plus full `tsc`/`next build` passes, including the static
export's own fixed-window twin (`analytics/page.static.tsx`).

**How to extend further:** with only one site per tenant in practice today, tenant-wide history
works fine; a tenant running multiple sites that share a canonical name (e.g., two farms both
metering `energy.grid.import.kw`) would see both sites' readings plotted as one series — a
per-metric site breakdown is the natural next step once that's a real scenario, not a demo one.

### The Overview dashboard was fixed for everyone — no way to prioritize, hide, or resize a card

**Gap:** every Overview metric card showed in the same fixed order, at the same size, for every
user — an operator who only cares about irrigation had to scroll past energy/water cards to reach
it, with no way to change that.

**Fix:** `dashboard_preferences` (one row per user, `007_dashboard_preferences.sql`) stores an
ordered list of `{key, visible, size}` per widget. `/settings` has a real "Dashboard" section:
Up/Down buttons reorder a card (priority), a Visible/Hidden toggle hides one, and a Small/Medium/
Large button cycles its display size (`.metric-card--small`/`--large` in `globals.css`) — all
plain Server Action forms, no client JavaScript. The Overview page applies whatever's saved
(`lib/dashboard-preferences.ts`) on top of whatever metrics the tenant actually has; a card the
tenant doesn't meter still just doesn't appear, same as before this existed.

**Verified:** 1 new `PlatformService` test (no-database fallback + save round-trip) plus full
`tsc`/`next build` passes for both SSR and static-export paths.

**How to extend further:** this is deliberately not drag-and-drop — up/down buttons were enough to
ship a real, working priority control without a new client-side library. A true drag-to-reorder
UI is a pure frontend enhancement on top of the same API whenever it's worth the added complexity.

### The seeded demo tenant and Eridon's real working account were the same tenant

**Gap:** `eridon.manuka@greecon.earth` — the real account meant to run Greecon's own real pilot —
was seeded as the owner of the same tenant that also held every fake demo site (solar/battery/
water/farm) and their simulated telemetry. Harmless while nothing real existed yet; actively
dangerous the moment a real farm gets provisioned into it, since real and fake data would then
share one dashboard with no way to tell them apart. There was also no single clean login to hand a
sales prospect — five different demo accounts existed, sharing one password.

**Fix (`006_split_demo_and_real_tenant.sql`):** Eridon's account moves to a brand new, completely
empty real tenant — his existing real password is untouched, only which tenant he belongs to
changes. The old demo tenant keeps every seeded fake site/telemetry/rule (exactly what makes it
useful for a demo) but is reduced to one login: **`demo@greecon.earth` / `demo123`** — safe to
hand to a prospect, since it lives in a tenant that only ever contains fake data and has no real
permissions over anything real by construction. See the credential rundown in
`docs/11-deployment-railway.md`.

**Action required on the live deployment:** migrations only run when explicitly triggered (see
"One-time setup" in `docs/11-deployment-railway.md`) — this migration will not take effect until
`npm run db:migrate -w @greecon/api` is run again against the real database. Until then, the live
site keeps running on the pre-split data. After it runs, **log out and log back in** if already
signed in as `eridon.manuka@greecon.earth` — an already-issued session token still carries the old
tenant ID until it's refreshed by a fresh login.

## Still open

### The cloud API isn't reachable from a remote edge site

**Gap:** the API is deliberately not exposed on the public internet (`docs/07-security-and-
rbac.md`, `docs/11-deployment-railway.md`) — its RBAC trusts a self-asserted role header with no
real per-request authentication, so making it publicly reachable would let anyone impersonate any
role. That's the right call for the web app, but it means an edge box at an actual remote farm
site has no public URL to send telemetry to.

**How to fix, short-term:** a WireGuard/Tailscale tunnel from the edge box into the same private
network as the API — no code changes, documented as the pilot-scale answer in
`docs/14-edge-hardware-deployment.md`. **Longer-term, for a real fleet:** replace the shared
role-header trust model for machine traffic specifically with a real device credential (a signed
JWT or mTLS client cert per gateway, checked against a table of provisioned gateways) so the
telemetry ingestion path can be exposed without inheriting the human-auth model's current
weakness. That's a materially bigger change than the tunnel and should wait until there's more
than a handful of pilot sites to justify it.

### Manual command targets are not filtered by role/site scope beyond permission

**Gap:** `ManualControlPanel` on the Automation page currently lists every write-capable point
across the whole tenant to anyone with `command:create`. For a single-tenant pilot this is fine;
for a multi-site deployment with per-site operators, an operator assigned to one site can
currently see (and command) every other site's actuators too.

**How to fix:** once user-to-site scoping exists (it doesn't yet — `Principal` only carries
`tenantId`, not a site list), filter the tenant-wide points list in
`apps/web/src/app/automation/page.tsx` to the caller's assigned sites before passing them to
`ManualControlPanel`.

## Verification notes

Everything marked "Fixed" above was verified against a real, running stack, not just read through:
`npm run typecheck`, `npm test` (all packages), a live local Postgres 16 instance with both
migrations applied, the compiled API and the Next.js app running together, and direct `curl`
checks against `/overview`, `/sites/:id`, and `POST /commands` (including confirming the
irrigation command was blocked before the safety fix, and dispatches successfully after it). The
static GitHub Pages export (`apps/web/scripts/build-static.sh`) was also rebuilt end-to-end to
confirm the new Manual Control UI degrades to a clear "requires a live deployment" message rather
than breaking the static build.

The MQTT bridge (`apps/edge-agent`) was verified the same way: a real local Mosquitto broker, the
existing simulator publishing to it, the new agent bridging to a real running API against real
Postgres, and confirmed fresh readings (not stale ones) landing in `telemetry_readings` on the
expected ~5-second cadence over several cycles.

Real authentication was verified with an actual headless browser (Playwright) driving the live
SSR app end-to-end: unauthenticated visit redirects to `/login`; a wrong password shows a real
error and does not log in; a correct password logs in, sets the session, and shows the real
logged-in user's name and role (not a hardcoded demo label); the Overview page renders real data
through the new session's bearer token; logging out clears the session and revisiting `/` redirects
back to `/login`. A second run confirmed a `viewer` account sees no Admin/Audit nav links and gets
a real 404 navigating to `/admin` directly by URL, not just a hidden link. The static export was
rebuilt end-to-end afterward to confirm the login/session code paths (which import a Server
Action, like the rule-management and manual-control work before it) don't break that build.

Provisioning CRUD was verified directly against real Postgres end-to-end: created a site, an
asset on it, a device on that asset (with position data), and a point on that device via the live
API; confirmed each landed correctly via `GET /sites/:id` and direct `psql` queries (including the
device's position inside `devices.metadata`); restarted the API process and confirmed the entire
chain survived; confirmed deleting a site with a device still attached is blocked (403); deleted
the point, device, and site in order and confirmed each delete actually took effect. That sequence
is what surfaced the `deleteSite` audit-ordering bug described above — it never showed up against
the unconfigured-database unit tests, only against a real foreign key.
