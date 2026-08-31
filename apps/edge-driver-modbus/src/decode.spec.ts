import { describe, expect, it } from "vitest";
import { decodeRegister, registerLength } from "./decode";
import { ModbusRegisterConfig } from "./config";

function register(overrides: Partial<ModbusRegisterConfig> = {}): ModbusRegisterConfig {
  return {
    siteId: "site-1",
    deviceId: "device-1",
    pointId: "point-1",
    canonicalName: "water.pressure.bar",
    label: "Line pressure",
    unit: "bar",
    address: 0,
    registerType: "holding",
    dataType: "uint16",
    ...overrides
  };
}

describe("decodeRegister", () => {
  it("decodes an unscaled uint16", () => {
    const buffer = Buffer.alloc(2);
    buffer.writeUInt16BE(42);
    expect(decodeRegister(buffer, register({ dataType: "uint16" }))).toBe(42);
  });

  it("applies scale to convert raw counts into engineering units", () => {
    const buffer = Buffer.alloc(2);
    buffer.writeUInt16BE(55);
    expect(decodeRegister(buffer, register({ dataType: "uint16", scale: 0.1 }))).toBeCloseTo(5.5);
  });

  it("decodes a signed int16 (negative values)", () => {
    const buffer = Buffer.alloc(2);
    buffer.writeInt16BE(-120);
    expect(decodeRegister(buffer, register({ dataType: "int16" }))).toBe(-120);
  });

  it("decodes a two-register float32", () => {
    const buffer = Buffer.alloc(4);
    buffer.writeFloatBE(24.6);
    expect(decodeRegister(buffer, register({ dataType: "float32" }))).toBeCloseTo(24.6, 4);
  });

  it("reports register length by data type", () => {
    expect(registerLength("uint16")).toBe(1);
    expect(registerLength("int16")).toBe(1);
    expect(registerLength("float32")).toBe(2);
  });
});
