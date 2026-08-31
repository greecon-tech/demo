import { readFileSync } from "fs";
import { CanonicalPointName } from "@greecon/shared";

export interface ModbusRegisterConfig {
  siteId: string;
  assetId?: string;
  deviceId: string;
  pointId: string;
  canonicalName: CanonicalPointName;
  label: string;
  unit: string;
  /** Zero-based Modbus register address. */
  address: number;
  registerType: "holding" | "input";
  dataType: "uint16" | "int16" | "float32";
  /** Raw register value is multiplied by this before publishing — e.g. a sensor reporting
   * pressure in 0.1 bar increments uses scale 0.1 so register value 55 becomes 5.5 bar. */
  scale?: number;
}

export interface ModbusDriverConfig {
  host: string;
  port: number;
  unitId: number;
  pollIntervalMs: number;
  tenantId: string;
  siteId: string;
  gatewayId: string;
  registers: ModbusRegisterConfig[];
}

export function loadConfig(): ModbusDriverConfig {
  const configPath = process.env.MODBUS_CONFIG_PATH;
  const configJson = process.env.MODBUS_CONFIG_JSON;

  if (!configPath && !configJson) {
    throw new Error("Set MODBUS_CONFIG_PATH (a JSON file) or MODBUS_CONFIG_JSON (inline JSON) — see docs/16-modbus-driver.md.");
  }

  const raw = configJson ?? readFileSync(configPath as string, "utf8");
  const parsed = JSON.parse(raw) as Partial<ModbusDriverConfig>;

  if (!parsed.host || !parsed.registers || parsed.registers.length === 0) {
    throw new Error("Modbus driver config must include at least host and a non-empty registers array.");
  }

  return {
    host: parsed.host,
    port: parsed.port ?? 502,
    unitId: parsed.unitId ?? 1,
    pollIntervalMs: parsed.pollIntervalMs ?? 5000,
    tenantId: parsed.tenantId ?? process.env.TENANT_ID ?? "",
    siteId: parsed.siteId ?? process.env.SITE_ID ?? "",
    gatewayId: parsed.gatewayId ?? process.env.GATEWAY_ID ?? "",
    registers: parsed.registers
  };
}
