import mqtt from "mqtt";
import { DEMO_TENANT_ID, TelemetryMessage } from "@greecon/shared";
import { OfflineBuffer } from "./offline-buffer";

// Bridges the on-site MQTT broker to the cloud API. Telemetry published locally by drivers or
// the edge simulator (docs/04-edge-runtime.md) has nowhere to go without this: the API only
// exposes POST /telemetry/ingest over HTTP, nothing on this stack subscribes to MQTT directly.
// This is the missing link between "a gateway is publishing on the local broker" and "the reading
// shows up on the dashboard" — see docs/14-edge-hardware-deployment.md for the full deployment.
const tenantId = process.env.TENANT_ID ?? DEMO_TENANT_ID;
const siteId = process.env.SITE_ID ?? "22222222-2222-4222-8222-222222222201";
const gatewayId = process.env.GATEWAY_ID ?? "77777777-7777-4777-8777-777777777701";
const mqttUrl = process.env.MQTT_URL ?? "mqtt://localhost:1883";
const apiUrl = process.env.API_URL ?? "http://localhost:4000";
// The API's RBAC currently trusts a self-asserted x-user-role header (see docs/07-security-and-
// rbac.md) — there is no separate machine/device credential yet. "operator" is the least-
// privileged role that still holds telemetry:ingest, matching how a real device identity would
// be scoped once one exists.
const apiRole = process.env.API_ROLE ?? "operator";
const flushIntervalMs = Number(process.env.FLUSH_INTERVAL_MS ?? 10_000);

const telemetryTopic = `greecon/${tenantId}/${siteId}/telemetry/+`;
const healthTopic = `greecon/${tenantId}/${siteId}/health/+`;

const buffer = new OfflineBuffer<TelemetryMessage>();

const client = mqtt.connect(mqttUrl, {
  clientId: `greecon-edge-agent-${gatewayId}`,
  clean: true,
  reconnectPeriod: 3000
});

client.on("connect", () => {
  client.subscribe([telemetryTopic, healthTopic]);
  process.stdout.write(`Edge agent connected to ${mqttUrl}, bridging ${telemetryTopic} -> ${apiUrl}/telemetry/ingest\n`);
  void flushBuffer();
});

client.on("error", (error) => {
  process.stderr.write(`MQTT connection error: ${error.message}\n`);
});

client.on("message", (topic, payload) => {
  if (topic.includes("/health/")) {
    process.stdout.write(`[health] ${payload.toString()}\n`);
    return;
  }

  let message: TelemetryMessage;
  try {
    message = JSON.parse(payload.toString()) as TelemetryMessage;
  } catch (error) {
    process.stderr.write(`Discarding malformed telemetry payload on ${topic}: ${error instanceof Error ? error.message : String(error)}\n`);
    return;
  }

  void forward(message);
});

setInterval(() => {
  void flushBuffer();
}, flushIntervalMs);

async function forward(message: TelemetryMessage): Promise<void> {
  try {
    await ingest(message);
  } catch (error) {
    buffer.append(message);
    process.stderr.write(
      `API unreachable, buffering reading (backlog: ${buffer.size()}): ${error instanceof Error ? error.message : String(error)}\n`
    );
  }
}

async function ingest(message: TelemetryMessage): Promise<void> {
  const response = await fetch(`${apiUrl}/telemetry/ingest`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user-role": apiRole,
      "x-tenant-id": tenantId
    },
    body: JSON.stringify(message)
  });

  if (!response.ok) {
    throw new Error(`ingest failed with status ${response.status}`);
  }
}

async function flushBuffer(): Promise<void> {
  if (buffer.size() === 0) return;
  const result = await buffer.flush(ingest);
  if (result.sent > 0) {
    process.stdout.write(`Flushed ${result.sent} buffered reading(s), ${result.retained} still pending.\n`);
  }
}

process.stdout.write(`Greecon edge agent starting for ${tenantId}/${siteId}, gateway ${gatewayId}.\n`);
