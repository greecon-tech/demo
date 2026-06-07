import mqtt from "mqtt";
import { randomUUID } from "crypto";
import {
  CommandAckMessage,
  CommandMessage,
  DEMO_TENANT_ID,
  DeviceHealthMessage,
  TelemetryMessage,
  TelemetryReading,
  mqttCommandAckTopic,
  mqttHealthTopic,
  mqttTelemetryTopic
} from "@greecon/shared";
import { OfflineBuffer } from "./offline-buffer";

const tenantId = process.env.TENANT_ID ?? DEMO_TENANT_ID;
const siteId = process.env.SITE_ID ?? "22222222-2222-4222-8222-222222222201";
const gatewayId = process.env.GATEWAY_ID ?? "77777777-7777-4777-8777-777777777701";
const mqttUrl = process.env.MQTT_URL ?? "mqtt://localhost:1883";

const deviceIds = {
  solar: "44444444-4444-4444-8444-444444444401",
  irrigation: "44444444-4444-4444-8444-444444444405",
  climate: "44444444-4444-4444-8444-444444444406"
};

const points = {
  solarPower: "55555555-5555-4555-8555-555555555501",
  soilMoisture: "55555555-5555-4555-8555-555555555506",
  temperature: "55555555-5555-4555-8555-555555555507",
  humidity: "55555555-5555-4555-8555-555555555508"
};

const buffer = new OfflineBuffer<TelemetryMessage>();
let tick = 0;
let connected = false;

const client = mqtt.connect(mqttUrl, {
  clientId: `greecon-edge-simulator-${gatewayId}`,
  clean: true,
  reconnectPeriod: 3000
});

client.on("connect", () => {
  connected = true;
  client.subscribe(`greecon/${tenantId}/${siteId}/commands/+`);
  void flushBuffer();
});

client.on("offline", () => {
  connected = false;
});

client.on("close", () => {
  connected = false;
});

client.on("message", (topic, payload) => {
  if (topic.endsWith("/ack")) return;

  try {
    const command = JSON.parse(payload.toString()) as CommandMessage;
    const acknowledgement: CommandAckMessage = {
      messageType: "command_ack",
      commandId: command.commandId,
      tenantId: command.tenantId,
      siteId: command.siteId,
      deviceId: command.target.deviceId,
      status: "executed",
      acknowledgementUtc: new Date().toISOString(),
      result: "Command executed by edge simulator in simulated mode.",
      correlationId: command.correlationId
    };
    client.publish(mqttCommandAckTopic(command.tenantId, command.siteId, command.target.deviceId), JSON.stringify(acknowledgement), {
      qos: 1
    });
  } catch (error) {
    process.stderr.write(`Command acknowledgement failed: ${error instanceof Error ? error.message : String(error)}\n`);
  }
});

setInterval(() => {
  const message = buildTelemetryMessage();
  if (!connected) {
    buffer.append(message);
    return;
  }

  publishTelemetry(message);
}, 5000);

setInterval(() => {
  publishHealth();
}, 15000);

function buildTelemetryMessage(): TelemetryMessage {
  tick += 1;
  const now = new Date().toISOString();
  const solarKw = Math.max(0, 18 + Math.sin(tick / 4) * 5);
  const soilMoisture = Math.max(18, 28 - tick * 0.05 + Math.sin(tick / 3));
  const temperature = 24 + Math.sin(tick / 5) * 2;
  const humidity = 61 + Math.cos(tick / 6) * 5;

  const readings: TelemetryReading[] = [
    reading(now, deviceIds.solar, points.solarPower, "energy.solar.power.kw", solarKw, "kW", "OK"),
    reading(now, deviceIds.irrigation, points.soilMoisture, "agri.soil.moisture.percent", soilMoisture, "%", soilMoisture < 20 ? "WARN" : "OK"),
    reading(now, deviceIds.climate, points.temperature, "agri.air.temperature.c", temperature, "C", "OK"),
    reading(now, deviceIds.climate, points.humidity, "agri.humidity.percent", humidity, "%", "OK")
  ];

  return {
    messageType: "telemetry",
    tenantId,
    siteId,
    deviceId: gatewayId,
    readings,
    publishedAtUtc: now,
    correlationId: randomUUID()
  };
}

function reading(
  timestampUtc: string,
  deviceId: string,
  pointId: string,
  canonicalName: TelemetryReading["canonicalName"],
  value: number,
  unit: string,
  quality: TelemetryReading["quality"]
): TelemetryReading {
  return {
    timestampUtc,
    tenantId,
    siteId,
    assetId: assetIdForPoint(pointId),
    deviceId,
    pointId,
    canonicalName,
    value: Number(value.toFixed(2)),
    unit,
    quality,
    source: "simulator",
    ingestionTimestampUtc: timestampUtc
  };
}

function publishTelemetry(message: TelemetryMessage): void {
  const firstReading = message.readings[0];
  if (!firstReading) return;
  client.publish(mqttTelemetryTopic(message.tenantId, message.siteId, firstReading.deviceId), JSON.stringify(message), {
    qos: 1
  });
}

function publishHealth(): void {
  const message: DeviceHealthMessage = {
    messageType: "device_health",
    tenantId,
    siteId,
    gatewayId,
    status: connected ? "OK" : "Offline",
    lastSeenUtc: new Date().toISOString(),
    softwareVersion: "edge-sim-0.1.0",
    bufferedReadings: buffer.size(),
    clockDriftMs: 0,
    correlationId: randomUUID()
  };
  client.publish(mqttHealthTopic(tenantId, siteId, gatewayId), JSON.stringify(message), { qos: 1, retain: true });
}

async function flushBuffer(): Promise<void> {
  await buffer.flush(async (message) => {
    publishTelemetry(message);
  });
}

function assetIdForPoint(pointId: string): string | undefined {
  if (pointId === points.solarPower) return "33333333-3333-4333-8333-333333333301";
  if (pointId === points.soilMoisture) return "33333333-3333-4333-8333-333333333305";
  if (pointId === points.temperature || pointId === points.humidity) return "33333333-3333-4333-8333-333333333307";
  return undefined;
}

process.stdout.write(`Greecon edge simulator connected to ${mqttUrl} for ${tenantId}/${siteId}.\n`);
