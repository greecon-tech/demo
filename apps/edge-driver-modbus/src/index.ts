import { randomUUID } from "crypto";
import mqtt from "mqtt";
import ModbusRTU from "modbus-serial";
import { TelemetryMessage, TelemetryReading, mqttTelemetryTopic } from "@greecon/shared";
import { loadConfig, ModbusRegisterConfig } from "./config";
import { decodeRegister, registerLength } from "./decode";

// A real field protocol driver — reads actual Modbus TCP registers and publishes the exact same
// TelemetryMessage shape/topic apps/edge-simulator does, so apps/edge-agent bridges it to the
// cloud API unchanged (see docs/13-pilot-readiness.md, "No real field protocol drivers yet").
// This is what turns telemetry from simulated demo data into real sensor readings.
const config = loadConfig();
const mqttUrl = process.env.MQTT_URL ?? "mqtt://127.0.0.1:1883";

const client = mqtt.connect(mqttUrl, {
  clientId: `greecon-modbus-driver-${config.gatewayId || randomUUID()}`,
  clean: true,
  reconnectPeriod: 3000
});

client.on("error", (error) => {
  process.stderr.write(`MQTT connection error: ${error.message}\n`);
});

const modbusClient = new ModbusRTU();
let connected = false;

async function connectModbus(): Promise<void> {
  try {
    await modbusClient.connectTCP(config.host, { port: config.port });
    modbusClient.setID(config.unitId);
    connected = true;
    process.stdout.write(`Connected to Modbus TCP device at ${config.host}:${config.port} (unit ${config.unitId}).\n`);
  } catch (error) {
    connected = false;
    process.stderr.write(`Modbus connection failed, retrying in 5s: ${error instanceof Error ? error.message : String(error)}\n`);
    setTimeout(() => void connectModbus(), 5000);
  }
}

async function readOne(register: ModbusRegisterConfig): Promise<TelemetryReading | undefined> {
  const length = registerLength(register.dataType);

  try {
    const result =
      register.registerType === "holding"
        ? await modbusClient.readHoldingRegisters(register.address, length)
        : await modbusClient.readInputRegisters(register.address, length);

    const value = decodeRegister(result.buffer, register);
    const now = new Date().toISOString();

    return {
      timestampUtc: now,
      tenantId: config.tenantId,
      siteId: register.siteId,
      assetId: register.assetId,
      deviceId: register.deviceId,
      pointId: register.pointId,
      canonicalName: register.canonicalName,
      value: Number(value.toFixed(3)),
      unit: register.unit,
      quality: "OK",
      source: "edge",
      ingestionTimestampUtc: now
    };
  } catch (error) {
    // A real read failure (device offline, register doesn't exist, wrong unit ID) — logged and
    // skipped rather than fabricated. Nothing here invents a "last known" reading; a point that
    // stops updating is itself a signal, not something this driver papers over. See
    // docs/13-pilot-readiness.md for the follow-up on making that signal explicit (stale-data
    // detection isn't implemented yet).
    process.stderr.write(
      `Failed to read register ${register.address} (${register.canonicalName}) on device ${register.deviceId}: ${
        error instanceof Error ? error.message : String(error)
      }\n`
    );
    return undefined;
  }
}

async function pollOnce(): Promise<void> {
  if (!connected) return;

  const readingsByDevice = new Map<string, TelemetryReading[]>();
  for (const register of config.registers) {
    const reading = await readOne(register);
    if (!reading) continue;
    const bucket = readingsByDevice.get(reading.deviceId) ?? [];
    bucket.push(reading);
    readingsByDevice.set(reading.deviceId, bucket);
  }

  const now = new Date().toISOString();
  for (const [deviceId, readings] of readingsByDevice) {
    const message: TelemetryMessage = {
      messageType: "telemetry",
      tenantId: config.tenantId,
      siteId: config.siteId,
      deviceId,
      readings,
      publishedAtUtc: now,
      correlationId: randomUUID()
    };
    client.publish(mqttTelemetryTopic(config.tenantId, config.siteId, deviceId), JSON.stringify(message), { qos: 1 });
  }
}

client.on("connect", () => {
  process.stdout.write(`Modbus driver bridging to ${mqttUrl}, polling ${config.registers.length} register(s) every ${config.pollIntervalMs}ms.\n`);
  void connectModbus();
  setInterval(() => {
    void pollOnce();
  }, config.pollIntervalMs);
});

process.stdout.write(`Greecon Modbus driver starting for ${config.tenantId}/${config.siteId}.\n`);
