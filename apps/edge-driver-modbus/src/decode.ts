import { ModbusRegisterConfig } from "./config";

/** How many 16-bit registers a data type spans. */
export function registerLength(dataType: ModbusRegisterConfig["dataType"]): number {
  return dataType === "float32" ? 2 : 1;
}

/** Decodes a raw register read into an engineering-unit value, applying `scale` if configured.
 * Modbus has no single standard byte/word order for multi-register values in the wild — this
 * assumes big-endian word order (the most common convention), which is the one thing a real
 * deployment against a specific device may need to adjust for that device's actual wiring. */
export function decodeRegister(buffer: Buffer, config: ModbusRegisterConfig): number {
  const scale = config.scale ?? 1;
  let raw: number;

  switch (config.dataType) {
    case "uint16":
      raw = buffer.readUInt16BE(0);
      break;
    case "int16":
      raw = buffer.readInt16BE(0);
      break;
    case "float32":
      raw = buffer.readFloatBE(0);
      break;
  }

  return raw * scale;
}
