# Edge Hardware Deployment

How to install the Greecon edge stack on a real industrial PC at a site (the Advantech
UNO-2271G V3 or an equivalent — see the hardware notes at the end of this doc) and get real
telemetry flowing into the platform.

## What actually ships in this pass

- **`apps/edge-agent`** — a small bridge that subscribes to the site's local MQTT topics and
  forwards telemetry to the cloud API's `POST /telemetry/ingest`, buffering in memory and
  retrying if the API is briefly unreachable. This did not exist before: nothing in the stack
  previously connected the MQTT side (`docs/04-edge-runtime.md`) to the HTTP side (the API), so a
  gateway publishing telemetry locally had no way to reach the dashboard at all. This closes that
  gap.
- **`apps/edge-simulator`** — already existed; publishes synthetic sine-wave readings to the local
  broker. Useful for proving the pipeline end-to-end before real device drivers exist. It is not,
  and should not be mistaken for, a real Modbus/OPC-UA driver.
- `infra/edge/` — the install script, systemd units, and config templates this guide uses.

## What does not exist yet (read this before you order cable)

- **No real protocol drivers.** Nothing in this repo reads a physical Modbus, OPC-UA, or 4-20mA
  device. `apps/edge-simulator` fakes the numbers. Writing an actual driver (Modbus RTU/TCP is the
  most common starting point) is the next real engineering task — it just needs to publish
  `TelemetryMessage` JSON (see `packages/shared`) to
  `greecon/{tenantId}/{siteId}/telemetry/{deviceId}` on the local broker; the edge-agent bridge
  added here doesn't care where the message came from.
- **Local safety evaluation isn't running on the edge yet.** `packages/gaia-core`'s safety checks
  currently only run inside the cloud API. The edge box does not independently block an unsafe
  command if it loses connectivity — the "operate safely during internet loss" goal in
  `docs/04-edge-runtime.md` is architecture, not yet code. Don't treat this box as a substitute for
  hard-wired physical interlocks (float switches, pressure relief valves) on anything that
  actually matters.
- **No site/device provisioning UI.** Site, gateway, device, and point IDs are fixed seed data or
  whatever's been inserted directly into Postgres (`docs/13-pilot-readiness.md`). You'll need
  those UUIDs by hand for now.

## Before you start: can this box actually reach the API?

This is the part that's easy to miss. The cloud API is **deliberately not exposed on the public
internet** — `docs/07-security-and-rbac.md` and `docs/11-deployment-railway.md` are explicit about
this, because the API's RBAC trusts a self-asserted role header with no real per-request
authentication yet. A publicly reachable API would let anyone impersonate any role. So an edge box
sitting at a remote farm site has no public URL to call.

For a pilot, the simplest fix that requires no code changes: put the edge box on the same private
network as the API via a WireGuard or Tailscale tunnel.

1. Deploy Tailscale (or WireGuard) on the machine/network where the API actually runs (Railway
   private networking or your GCP VPC).
2. Install the same client on the edge box during provisioning (`apt install tailscale` on
   Ubuntu, then `tailscale up`, or the equivalent WireGuard peer config).
3. Set `API_URL` in `edge.env` to the API's address **on that private network**, not a public
   hostname.

If the edge box happens to be on the same LAN/VPC as the API already (e.g. a pilot running
everything in one building), you can skip the tunnel and point `API_URL` straight at the API's
internal address.

Do not solve this by giving the API a public domain "just for the edge box." That reopens the
exact hole `docs/07-security-and-rbac.md` calls out.

## Step 1 — Flash the OS

Install Ubuntu Server 24.04 LTS (or whatever current LTS the vendor image supports) on the
industrial PC. Advantech ships UNO-series units with Ubuntu pre-validated — check the box's
support page for a vendor-provided image before doing a generic install, since it'll already have
the right kernel modules for the onboard serial/expansion hardware.

## Step 2 — Network

Configure the two NICs deliberately, don't leave both on DHCP from the same network:

- **NIC 1 (OT/field network):** static IP, on the same subnet as your Modbus/OPC-UA field devices
  once they exist. No internet route needed on this interface.
- **NIC 2 (uplink):** whatever gets this box onto the internet/VPN (site LAN, or the cellular
  module if this is a genuinely remote site). This is the interface the Tailscale/WireGuard tunnel
  above rides on.

## Step 3 — Get the software onto the box

From your workstation, add a read-only deploy key for this repo (GitHub → repo Settings → Deploy
keys → Add deploy key, do not check "Allow write access") and note the private key path — the
install script clones over SSH using whatever key is already configured for the `root` user
running it.

```sh
scp infra/edge/*.sh infra/edge/*.conf infra/edge/*.service infra/edge/*.example \
    you@edge-box:/tmp/greecon-edge/
ssh you@edge-box
cd /tmp/greecon-edge
sudo REPO_URL=git@github.com:greecon-tech/demo.git GIT_REF=main ./install.sh
```

`install.sh` (in `infra/edge/`) does the rest: installs Node.js 22 and Mosquitto, configures the
broker to listen on loopback only (`infra/edge/mosquitto-edge.conf` — this broker never needs to
be reachable from the network, only the local edge-agent and driver processes talk to it), clones
the repo into `/opt/greecon`, builds `edge-agent` and `edge-simulator`, and installs both as
systemd services (only `greecon-edge-agent` is enabled by default).

## Step 4 — Configure this site

```sh
sudo nano /etc/greecon/edge.env
```

Fill in the three blanks from `infra/edge/edge.env.example`:

- `SITE_ID` — this site's UUID from the platform's `sites` table.
- `GATEWAY_ID` — this gateway's UUID from `edge_gateways`.
- `API_URL` — the API's address on the private network/tunnel from the prerequisite step.

## Step 5 — Start it

```sh
sudo systemctl start greecon-edge-agent
sudo systemctl status greecon-edge-agent
sudo journalctl -u greecon-edge-agent -f
```

You should see:

```
Greecon edge agent starting for <tenant>/<site>, gateway <gateway>.
Edge agent connected to mqtt://127.0.0.1:1883, bridging greecon/<tenant>/<site>/telemetry/+ -> <API_URL>/telemetry/ingest
```

## Step 6 — Prove the pipeline end-to-end before wiring real devices

With no real driver publishing yet, there's nothing on the telemetry topic. Temporarily run the
simulator to confirm the whole chain — broker → agent → API → dashboard — actually works:

```sh
sudo systemctl enable --now greecon-edge-simulator
```

Open the Overview or site detail page for this site in the web app; you should see live-updating
readings within about 10 seconds. Once confirmed:

```sh
sudo systemctl disable --now greecon-edge-simulator
```

Leave it disabled for a live pilot — it publishes fake numbers under the same site/device IDs your
real equipment will use, which would corrupt real readings if left running.

## Step 7 — Wiring in a real driver, later

Whoever writes the actual Modbus/OPC-UA driver for the connected equipment just needs to publish
the same `TelemetryMessage` JSON shape the simulator uses (see `apps/edge-simulator/src/index.ts`
for the exact shape, and `packages/shared`'s `canonicalPoints` for valid `canonicalName` values)
to `greecon/{tenantId}/{siteId}/telemetry/{deviceId}` on the local broker (`mqtt://127.0.0.1:1883`
from this box). `greecon-edge-agent` doesn't need to change at all — it bridges whatever's on that
topic, real or simulated.

## Troubleshooting

- **`journalctl` shows repeated "API unreachable, buffering reading" lines.** The agent can reach
  the local broker but not `API_URL`. Check the tunnel/VPN is actually up (`tailscale status` or
  `wg show`) and that `API_URL` resolves and is reachable with `curl $API_URL/health` from the
  edge box itself.
- **No readings show up at all, not even a buffering message.** Nothing is publishing to the
  telemetry topic. Confirm with `mosquitto_sub -h 127.0.0.1 -t 'greecon/#' -v` — if you see nothing
  there, the problem is upstream of the agent (simulator not running, or a real driver not
  publishing).
- **`systemctl status greecon-edge-agent` shows it repeatedly restarting.** Check
  `journalctl -u greecon-edge-agent -e` for the actual error — most likely `/etc/greecon/edge.env`
  is missing a required value, or Node.js failed to resolve `@greecon/shared` (re-run
  `npm run build:packages` in `/opt/greecon`).
- **Backlog keeps growing and never drains.** The buffer is in-process memory only — if the API
  stays unreachable for a long outage, restarting the service loses whatever hadn't flushed yet.
  This is a known limitation (`docs/13-pilot-readiness.md`); for now, fix the connectivity issue
  rather than relying on the buffer for anything beyond short blips.

## Hardware reference

Recommended unit: **Advantech UNO-2271G V3** (Intel Atom x7211RE, 8GB LPDDR5, 64GB eMMC, dual GbE,
DIN-rail, 9–36V DC, with the RS-485/RS-232 and 4G/5G iDoor expansion modules for Modbus RTU field
devices and cellular backhaul). Cheaper alternative for a lean multi-site rollout: OnLogic CL260.
More headroom if edge-side AI/optimization is planned later: ASUS IoT PE1000U. None of these read
analog (4-20mA) sensors directly — pair with a Modbus remote I/O module (e.g. an Advantech
ADAM-4000 series unit) for those.
