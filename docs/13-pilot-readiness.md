# Pilot Readiness — Gaps and How-To Fixes

This is a running audit of the platform against what a real pilot deployment needs, in the
"what's the gap, and how do we close it" format. Items are grouped by status: fixed this pass,
and still open with a concrete next step. Update this file as gaps are closed or new ones are
found — it is meant to stay current, not be a one-time snapshot.

## Fixed in this pass

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

**How to extend further:** positions currently live only in the in-memory seed data — devices are
not yet persisted to or hydrated from Postgres at all (see "Device/point provisioning" below), so
a position set today does not survive an API restart when a database is configured. To make this
durable: (1) add device create/update endpoints, (2) store `position_x`/`position_y` in the
existing `devices.metadata` jsonb column (already in the schema, unused), (3) hydrate devices from
the database in `PlatformService.onModuleInit()` the same way rules/telemetry/commands already
are. In production this data would come from a site commissioning/survey step (GPS or as-built
drawing coordinates converted to percentages of the site boundary), not be hand-typed.

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

## Still open

### No real field protocol drivers yet

**Gap:** `apps/edge-simulator` publishes synthetic sine-wave readings. Nothing in the repo
actually reads a Modbus, OPC-UA, or analog field device — the `protocol` field on `Device` models
these as first-class concepts, but no driver implements any of them.

**How to fix:** write a driver process (start with Modbus TCP/RTU — it's the most common protocol
for pumps, VFDs, and level transmitters) that publishes `TelemetryMessage` JSON to
`greecon/{tenantId}/{siteId}/telemetry/{deviceId}` on the on-site broker. `apps/edge-agent`
(added this pass) already bridges whatever's on that topic to the cloud API — a real driver is a
drop-in replacement for the simulator, no changes needed elsewhere.

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

### Site/device/point provisioning has no CRUD

**Gap:** Sites, assets, devices, and points are fixed, hardcoded seed arrays regardless of
whether a database is configured — there are no create/update/delete endpoints for any of them.
Rules, telemetry, commands, alerts, incidents, audit events, edge-sync batches, and report exports
are all fully persisted (see `docs/11-deployment-railway.md`); this layer is not.

**How to fix:** add `POST/PATCH/DELETE` endpoints under `sites`, `assets`, `devices`, and `points`
modules following the exact pattern already proven for rules
(`apps/api/src/modules/rules/*.dto.ts`, `rules.controller.ts`,
`PlatformService.createRule`/`updateRule`/`deleteRule`): DTO with `class-validator` decorators,
`RequirePermissions("device:manage")`/`"site:manage"` guard, dual-write to the in-memory array and
(when `DatabaseService.isConfigured()`) to Postgres, and hydration in `onModuleInit()`. This is
the highest-value remaining gap for a real pilot, since onboarding an actual customer site means
registering real devices and points, not editing seed data in source.

### Irrigation and pump safety limits are not yet admin-configurable per site

**Gap:** `defaultSafetyLimits` in `packages/gaia-core` (max pressure, dry-run flow threshold, pump
runtime/rest, irrigation run cap) is one fixed object applied to every site and tenant. A real
pilot will have sites with genuinely different physical limits (different pipe ratings, different
crop/irrigation zone sizes).

**How to fix:** move `SafetyLimits` from a hardcoded constant to a per-site (or per-device)
configuration value, stored alongside the site/asset record once the provisioning CRUD above
exists, and passed into `evaluateCommandSafety` per the site being commanded instead of the module
constant. `defaultSafetyLimits` should remain as the fallback for a site that hasn't set explicit
limits.

### Maintenance tasks have no mutation endpoints

**Gap:** `maintenanceTasks` is deliberately `readonly` in `PlatformService` — there is a `GET` but
no way to create, update, or close a maintenance task.

**How to fix:** same pattern as rules/devices above — add a maintenance module with
create/update/close endpoints, gated on `maintenance:manage` (owner/admin/operator already hold
it), dual-writing to `maintenance_tasks` (already in the schema).

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
