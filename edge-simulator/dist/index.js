"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mqtt_1 = __importDefault(require("mqtt"));
const crypto_1 = require("crypto");
const shared_1 = require("@greecon/shared");
const offline_buffer_1 = require("./offline-buffer");
const tenantId = process.env.TENANT_ID ?? shared_1.DEMO_TENANT_ID;
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
const buffer = new offline_buffer_1.OfflineBuffer();
let tick = 0;
let connected = false;
const client = mqtt_1.default.connect(mqttUrl, {
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
    if (topic.endsWith("/ack"))
        return;
    try {
        const command = JSON.parse(payload.toString());
        const acknowledgement = {
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
        client.publish((0, shared_1.mqttCommandAckTopic)(command.tenantId, command.siteId, command.target.deviceId), JSON.stringify(acknowledgement), {
            qos: 1
        });
    }
    catch (error) {
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
function buildTelemetryMessage() {
    tick += 1;
    const now = new Date().toISOString();
    const solarKw = Math.max(0, 18 + Math.sin(tick / 4) * 5);
    const soilMoisture = Math.max(18, 28 - tick * 0.05 + Math.sin(tick / 3));
    const temperature = 24 + Math.sin(tick / 5) * 2;
    const humidity = 61 + Math.cos(tick / 6) * 5;
    const readings = [
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
        correlationId: (0, crypto_1.randomUUID)()
    };
}
function reading(timestampUtc, deviceId, pointId, canonicalName, value, unit, quality) {
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
function publishTelemetry(message) {
    const firstReading = message.readings[0];
    if (!firstReading)
        return;
    client.publish((0, shared_1.mqttTelemetryTopic)(message.tenantId, message.siteId, firstReading.deviceId), JSON.stringify(message), {
        qos: 1
    });
}
function publishHealth() {
    const message = {
        messageType: "device_health",
        tenantId,
        siteId,
        gatewayId,
        status: connected ? "OK" : "Offline",
        lastSeenUtc: new Date().toISOString(),
        softwareVersion: "edge-sim-0.1.0",
        bufferedReadings: buffer.size(),
        clockDriftMs: 0,
        correlationId: (0, crypto_1.randomUUID)()
    };
    client.publish((0, shared_1.mqttHealthTopic)(tenantId, siteId, gatewayId), JSON.stringify(message), { qos: 1, retain: true });
}
async function flushBuffer() {
    await buffer.flush(async (message) => {
        publishTelemetry(message);
    });
}
function assetIdForPoint(pointId) {
    if (pointId === points.solarPower)
        return "33333333-3333-4333-8333-333333333301";
    if (pointId === points.soilMoisture)
        return "33333333-3333-4333-8333-333333333305";
    if (pointId === points.temperature || pointId === points.humidity)
        return "33333333-3333-4333-8333-333333333307";
    return undefined;
}
process.stdout.write(`Greecon edge simulator connected to ${mqttUrl} for ${tenantId}/${siteId}.\n`);
//# sourceMappingURL=index.js.map