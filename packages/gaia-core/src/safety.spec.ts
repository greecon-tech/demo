import { describe, expect, it } from "vitest";
import { AutomationRule, CommandMessage, DEMO_TENANT_ID } from "@greecon/shared";
import {
  defaultSafetyLimits,
  deriveOperationalStates,
  evaluateCommandSafety,
  simulateRule,
  type SafetyContext,
  type SensorSnapshot
} from "./index";

const command: CommandMessage = {
  messageType: "command",
  commandId: "cmd-1",
  tenantId: DEMO_TENANT_ID,
  siteId: "site-1",
  target: {
    deviceId: "pump-1",
    pointId: "point-command",
    canonicalName: "water.pump.command"
  },
  requestedValue: "ON",
  requestedBy: "operator-1",
  requestedByRole: "operator",
  reason: "Refill tank during operating window",
  issuedAtUtc: "2026-04-29T10:00:00.000Z",
  correlationId: "corr-1"
};

const healthySensors: SensorSnapshot = {
  "water.flow.lpm": { value: 12, unit: "lpm", quality: "OK", timestampUtc: "2026-04-29T09:59:00.000Z" },
  "water.pressure.bar": { value: 2.4, unit: "bar", quality: "OK", timestampUtc: "2026-04-29T09:59:00.000Z" },
  "water.tank.level.percent": { value: 42, unit: "%", quality: "OK", timestampUtc: "2026-04-29T09:59:00.000Z" },
  "energy.solar.power.kw": { value: 8.4, unit: "kW", quality: "OK", timestampUtc: "2026-04-29T09:59:00.000Z" },
  "energy.consumption.kw": { value: 4.1, unit: "kW", quality: "OK", timestampUtc: "2026-04-29T09:59:00.000Z" }
};

function context(overrides: Partial<SafetyContext> = {}): SafetyContext {
  return {
    command,
    sensors: healthySensors,
    states: {},
    limits: defaultSafetyLimits,
    systemMode: "automatic",
    ...overrides
  };
}

describe("GAIA safety primitives", () => {
  it("allows a command when role, quality, pressure, and interlocks are valid", () => {
    const result = evaluateCommandSafety(context());
    expect(result.allowed).toBe(true);
    expect(result.result).toBe("passed");
  });

  it("blocks viewers from issuing commands", () => {
    const result = evaluateCommandSafety(
      context({
        command: { ...command, requestedByRole: "viewer" }
      })
    );
    expect(result.allowed).toBe(false);
    expect(result.reasons.join(" ")).toContain("viewer");
  });

  it("blocks commands when a required sensor has BAD quality", () => {
    const result = evaluateCommandSafety(
      context({
        sensors: {
          ...healthySensors,
          "water.flow.lpm": { value: 11, unit: "lpm", quality: "BAD", timestampUtc: "2026-04-29T09:59:00.000Z" }
        }
      })
    );
    expect(result.allowed).toBe(false);
    expect(result.hardSafetyBlock).toBe(true);
  });

  it("blocks dry-run risk when pump is requested on and flow is zero", () => {
    const result = evaluateCommandSafety(
      context({
        sensors: {
          ...healthySensors,
          "water.flow.lpm": { value: 0, unit: "lpm", quality: "OK", timestampUtc: "2026-04-29T09:59:00.000Z" }
        }
      })
    );
    expect(result.allowed).toBe(false);
    expect(result.reasons.join(" ")).toContain("flow is 0.00 lpm");
  });

  it("blocks overpressure", () => {
    const result = evaluateCommandSafety(
      context({
        sensors: {
          ...healthySensors,
          "water.pressure.bar": { value: 6.1, unit: "bar", quality: "OK", timestampUtc: "2026-04-29T09:59:00.000Z" }
        }
      })
    );
    expect(result.allowed).toBe(false);
    expect(result.reasons.join(" ")).toContain("exceeds limit");
  });

  it("derives irrigation and energy surplus states from normalized telemetry", () => {
    const states = deriveOperationalStates({
      ...healthySensors,
      "agri.soil.moisture.percent": { value: 21, unit: "%", quality: "OK", timestampUtc: "2026-04-29T09:59:00.000Z" }
    });
    expect(states.find((state) => state.stateKey === "agri.irrigation_required")?.stateValue).toBe(true);
    expect(states.find((state) => state.stateKey === "energy.surplus_available")?.stateValue).toBe(true);
  });

  it("simulates an advisory rule without actuation", () => {
    const rule: AutomationRule = {
      id: "rule-advisory",
      tenantId: DEMO_TENANT_ID,
      name: "Advisory: reduce irrigation if rain forecast placeholder is true",
      priority: "advisory",
      triggerType: "forecast",
      conditions: [{ stateKey: "agri.irrigation_required", operator: "eq", value: true }],
      constraints: [],
      actions: [{ type: "recommendation", message: "Review forecast before irrigation." }],
      executionMode: "simulation",
      explanationTemplate: "Forecast-aware irrigation remains in advisory mode for MVP.",
      rollbackBehavior: "No physical action is dispatched.",
      enabled: true,
      approvalState: "approved",
      version: 1,
      createdBy: "system",
      updatedBy: "system"
    };

    const result = simulateRule(rule, healthySensors, {
      "agri.irrigation_required": {
        id: "state-1",
        tenantId: DEMO_TENANT_ID,
        siteId: "site-1",
        stateKey: "agri.irrigation_required",
        stateValue: true,
        severity: "watch",
        confidence: 0.9,
        reason: "Soil moisture below threshold.",
        createdAtUtc: "2026-04-29T09:59:00.000Z",
        updatedAtUtc: "2026-04-29T09:59:00.000Z"
      }
    });

    expect(result.fired).toBe(true);
    expect(result.simulated).toBe(true);
  });
});
