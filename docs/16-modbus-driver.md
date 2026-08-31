# Modbus TCP Driver

`apps/edge-driver-modbus` reads real Modbus TCP registers and publishes them as the same
`TelemetryMessage` JSON shape/topic `apps/edge-simulator` uses — `apps/edge-agent` bridges it to
the cloud API with zero changes, exactly as promised in
`docs/14-edge-hardware-deployment.md`. This is what makes real sensor data reach the platform;
before it existed, `apps/edge-simulator`'s synthetic sine waves were the only telemetry source
anywhere in the stack.

## Configuration

Set `MODBUS_CONFIG_PATH` to a JSON file (or `MODBUS_CONFIG_JSON` to inline the same JSON):

```json
{
  "host": "192.168.1.50",
  "port": 502,
  "unitId": 1,
  "pollIntervalMs": 5000,
  "tenantId": "11111111-1111-4111-8111-111111111111",
  "siteId": "22222222-2222-4222-8222-222222222202",
  "gatewayId": "77777777-7777-4777-8777-777777777702",
  "registers": [
    {
      "siteId": "22222222-2222-4222-8222-222222222202",
      "assetId": "33333333-3333-4333-8333-333333333304",
      "deviceId": "44444444-4444-4444-8444-444444444404",
      "pointId": "55555555-5555-4555-8555-555555555505",
      "canonicalName": "water.pressure.bar",
      "label": "Line pressure",
      "unit": "bar",
      "address": 0,
      "registerType": "holding",
      "dataType": "uint16",
      "scale": 0.1
    }
  ]
}
```

Each entry in `registers` maps one Modbus register to one platform point:

- `address` — zero-based Modbus register address.
- `registerType` — `"holding"` or `"input"` (function code 3 vs. 4 — check the device's manual;
  most PLCs and VFDs use holding registers for everything, but dedicated sensor transmitters
  often expose readings as input registers).
- `dataType` — `"uint16"`/`"int16"` (one register) or `"float32"` (two registers, decoded
  big-endian — see the caveat below).
- `scale` — optional multiplier applied to the raw value. A sensor reporting pressure in 0.1 bar
  increments uses `scale: 0.1` so a raw reading of 55 becomes 5.5 bar.
- `siteId`/`assetId`/`deviceId`/`pointId`/`canonicalName` — must match real IDs already
  provisioned via the Sites/Assets/Devices/Points API (`docs/13-pilot-readiness.md`,
  "Site/device/point provisioning"). The driver doesn't create these itself.

**Byte order caveat:** Modbus has no single universal convention for multi-register values.
This driver assumes big-endian word order, the most common convention — if a real device's
`float32` values come back nonsensical, the vendor's manual will specify byte/word order, and it
may need reversing before this driver would read it correctly (not yet configurable — see "How to
extend further" below).

## Running it

```sh
export MODBUS_CONFIG_PATH=/etc/greecon/modbus.json
export MQTT_URL=mqtt://127.0.0.1:1883
node dist/index.js
```

On the edge box, this runs as its own systemd service alongside `greecon-edge-agent`
(`infra/edge/greecon-edge-driver-modbus.service`) — see `docs/14-edge-hardware-deployment.md` for
the full install. Multiple Modbus devices at one site can share a single driver instance (list
every register from every device in the same config) or run one instance per device if they're on
different IPs/ports — either works, since each poll cycle groups readings by `deviceId` before
publishing.

## What this doesn't do yet

- **No write support.** This driver only reads. Manual/automated commands (`docs/13-pilot-
  readiness.md`'s irrigation/pump control) still only affect the platform's own state — closing
  the loop so a dispatched command actually writes a Modbus coil/register on the real device is a
  separate, not-yet-built piece.
- **No stale-data detection.** A failed register read is logged and skipped, not published with a
  degraded quality flag — so a device that goes offline stops producing new readings rather than
  producing an explicit "no longer reachable" signal. The dashboard would show the last known
  value going quiet, not a flagged alert.
- **No configurable byte order** for multi-register values (see the caveat above) — currently
  fixed to big-endian.
- **Modbus RTU (serial) isn't wired up**, only TCP — `modbus-serial` (the library this uses)
  supports RTU too; extending `config.ts`/`index.ts` to open a serial port instead of a TCP socket
  when configured would cover it.

## Verification

Tested against a real Modbus TCP server (not a mock) — `ServerTCP` from the same `modbus-serial`
library backing a two-register pump station simulation (pressure as scaled `uint16`, flow as
`float32` across two registers) with values that genuinely drift over time. Confirmed the driver
correctly decoded both, published them over MQTT, and — through the existing `edge-agent` bridge —
watched the actual decoded values land in `telemetry_readings` in Postgres, changing on every poll
cycle exactly as the simulated device's registers changed.
