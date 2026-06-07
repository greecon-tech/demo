import {
  AutomationRule,
  CanonicalPointName,
  CommandMessage,
  DerivedState,
  QualityFlag,
  RuleCondition,
  RulePriorityLevel,
  StateKey,
  TelemetryReading,
  UserRole,
  hasPermission
} from "@greecon/shared";

export interface SensorSnapshotValue {
  value: number | boolean | string;
  unit: string;
  quality: QualityFlag;
  timestampUtc: string;
}

export type SensorSnapshot = Partial<Record<CanonicalPointName, SensorSnapshotValue>>;
export type StateSnapshot = Partial<Record<StateKey, DerivedState>>;

export interface SafetyLimits {
  maxPressureBar: number;
  dryRunFlowLpm: number;
  maxPumpRuntimeMinutes: number;
  minPumpRestMinutes: number;
}

export interface SafetyContext {
  command: CommandMessage;
  sensors: SensorSnapshot;
  states: StateSnapshot;
  limits: SafetyLimits;
  systemMode: "automatic" | "manual" | "maintenance" | "emergency_stop";
  lastPumpStartedAtUtc?: string;
  lastPumpStoppedAtUtc?: string;
}

export interface SafetyEvaluation {
  allowed: boolean;
  result: "passed" | "blocked";
  reasons: string[];
  hardSafetyBlock: boolean;
  requiredAudit: boolean;
}

export const defaultSafetyLimits: SafetyLimits = {
  maxPressureBar: 5.5,
  dryRunFlowLpm: 0.2,
  maxPumpRuntimeMinutes: 45,
  minPumpRestMinutes: 10
};

const priorityWeight: Record<RulePriorityLevel, number> = {
  safety: 6,
  asset_protection: 5,
  compliance: 4,
  optimization: 3,
  efficiency: 2,
  advisory: 1
};

export function compareRulePriority(a: RulePriorityLevel, b: RulePriorityLevel): number {
  return priorityWeight[a] - priorityWeight[b];
}

export function requiredSensorPointsForCommand(command: CommandMessage): CanonicalPointName[] {
  if (command.target.canonicalName === "water.pump.command") {
    return ["water.flow.lpm", "water.pressure.bar"];
  }

  if (command.target.canonicalName === "agri.irrigation.command") {
    return ["agri.soil.moisture.percent", "water.pressure.bar"];
  }

  return [];
}

export function evaluateCommandSafety(context: SafetyContext): SafetyEvaluation {
  const reasons: string[] = [];
  let hardSafetyBlock = false;
  const { command, sensors, states, limits } = context;

  if (!hasPermission(command.requestedByRole, "command:create")) {
    reasons.push(`Role ${command.requestedByRole} cannot issue equipment commands.`);
  }

  if (!command.reason || command.reason.trim().length < 6) {
    reasons.push("A clear operating reason is required.");
  }

  if (context.systemMode === "emergency_stop") {
    reasons.push("Emergency stop is active.");
    hardSafetyBlock = true;
  }

  if (command.manualOverride) {
    const expiresAt = Date.parse(command.manualOverride.expiresAtUtc);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      reasons.push("Manual override is expired or invalid.");
    }
    if (!["owner", "admin", "operator"].includes(command.requestedByRole)) {
      reasons.push("Manual override requires owner, admin, or operator role.");
    }
  }

  for (const pointName of requiredSensorPointsForCommand(command)) {
    const point = sensors[pointName];
    if (!point) {
      reasons.push(`Required sensor ${pointName} is unavailable.`);
      continue;
    }
    if (point.quality === "BAD") {
      reasons.push(`Required sensor ${pointName} has BAD quality.`);
      hardSafetyBlock = true;
    }
  }

  const pressure = numericSensor(sensors["water.pressure.bar"]);
  if (pressure !== undefined && pressure >= limits.maxPressureBar) {
    reasons.push(`Water pressure ${pressure.toFixed(2)} bar exceeds limit ${limits.maxPressureBar.toFixed(2)} bar.`);
    hardSafetyBlock = true;
  }

  const dryRunState = states["water.pump.dry_run_risk"];
  if (dryRunState?.stateValue === true) {
    reasons.push("Dry-run risk state is active.");
    hardSafetyBlock = true;
  }

  if (command.target.canonicalName === "water.pump.command" && isOnValue(command.requestedValue)) {
    const flow = numericSensor(sensors["water.flow.lpm"]);
    if (flow !== undefined && flow <= limits.dryRunFlowLpm) {
      reasons.push(`Pump command blocked because flow is ${flow.toFixed(2)} lpm.`);
      hardSafetyBlock = true;
    }

    if (context.lastPumpStoppedAtUtc) {
      const minutesSinceStop = minutesBetween(context.lastPumpStoppedAtUtc, command.issuedAtUtc);
      if (minutesSinceStop < limits.minPumpRestMinutes) {
        reasons.push(`Pump rest time is ${minutesSinceStop.toFixed(1)} minutes; minimum is ${limits.minPumpRestMinutes}.`);
      }
    }
  }

  const allowed = reasons.length === 0;
  return {
    allowed,
    result: allowed ? "passed" : "blocked",
    reasons,
    hardSafetyBlock,
    requiredAudit: true
  };
}

export interface DerivedStateEvaluation {
  stateKey: StateKey;
  stateValue: boolean;
  severity: "info" | "watch" | "warning" | "critical";
  confidence: number;
  reason: string;
}

export function deriveOperationalStates(sensors: SensorSnapshot): DerivedStateEvaluation[] {
  const tankLevel = numericSensor(sensors["water.tank.level.percent"]);
  const pressure = numericSensor(sensors["water.pressure.bar"]);
  const flow = numericSensor(sensors["water.flow.lpm"]);
  const solarPower = numericSensor(sensors["energy.solar.power.kw"]);
  const consumption = numericSensor(sensors["energy.consumption.kw"]);
  const batterySoc = numericSensor(sensors["energy.battery.soc.percent"]);
  const soilMoisture = numericSensor(sensors["agri.soil.moisture.percent"]);

  const states: DerivedStateEvaluation[] = [];

  if (tankLevel !== undefined) {
    states.push({
      stateKey: "water.tank.critical",
      stateValue: tankLevel < 15,
      severity: tankLevel < 15 ? "critical" : "info",
      confidence: sensors["water.tank.level.percent"]?.quality === "OK" ? 0.95 : 0.65,
      reason: `Tank level is ${tankLevel.toFixed(1)}%.`
    });
    states.push({
      stateKey: "water.tank.low",
      stateValue: tankLevel < 35,
      severity: tankLevel < 35 ? "warning" : "info",
      confidence: 0.9,
      reason: `Tank low threshold evaluated at ${tankLevel.toFixed(1)}%.`
    });
  }

  if (flow !== undefined) {
    states.push({
      stateKey: "water.pump.dry_run_risk",
      stateValue: flow <= defaultSafetyLimits.dryRunFlowLpm,
      severity: flow <= defaultSafetyLimits.dryRunFlowLpm ? "critical" : "info",
      confidence: 0.9,
      reason: `Flow is ${flow.toFixed(2)} lpm.`
    });
  }

  if (pressure !== undefined) {
    states.push({
      stateKey: "system.sensor_quality_bad",
      stateValue: hasBadQuality(sensors),
      severity: hasBadQuality(sensors) ? "warning" : "info",
      confidence: 1,
      reason: hasBadQuality(sensors) ? "One or more required sensors reports BAD quality." : "Required sensor quality is acceptable."
    });
  }

  if (solarPower !== undefined && consumption !== undefined) {
    const surplus = solarPower - consumption;
    states.push({
      stateKey: "energy.surplus_available",
      stateValue: surplus > 1.5,
      severity: surplus > 1.5 ? "watch" : "info",
      confidence: 0.85,
      reason: `Solar surplus estimate is ${surplus.toFixed(1)} kW.`
    });
  }

  if (batterySoc !== undefined) {
    states.push({
      stateKey: "energy.battery.constrained",
      stateValue: batterySoc < 25,
      severity: batterySoc < 25 ? "warning" : "info",
      confidence: 0.9,
      reason: `Battery state of charge is ${batterySoc.toFixed(1)}%.`
    });
  }

  if (soilMoisture !== undefined) {
    states.push({
      stateKey: "agri.irrigation_required",
      stateValue: soilMoisture < 28,
      severity: soilMoisture < 28 ? "watch" : "info",
      confidence: 0.85,
      reason: `Soil moisture is ${soilMoisture.toFixed(1)}%.`
    });
  }

  return states;
}

export interface RuleSimulationResult {
  ruleId: string;
  fired: boolean;
  simulated: boolean;
  priority: RulePriorityLevel;
  explanation: string;
  actions: string[];
  safetyNotes: string[];
}

export function simulateRule(rule: AutomationRule, sensors: SensorSnapshot, states: StateSnapshot): RuleSimulationResult {
  const conditionResults = rule.conditions.map((condition) => evaluateCondition(condition, sensors, states));
  const constraintResults = rule.constraints.map((condition) => evaluateCondition(condition, sensors, states));
  const fired = rule.enabled && conditionResults.every(Boolean) && constraintResults.every(Boolean);

  return {
    ruleId: rule.id,
    fired,
    simulated: rule.executionMode === "simulation" || rule.executionMode === "advisory",
    priority: rule.priority,
    explanation: fired ? renderExplanation(rule, sensors, states) : `Rule ${rule.name} did not fire under current state.`,
    actions: fired ? rule.actions.map((action) => action.message) : [],
    safetyNotes: fired && ["safety", "asset_protection"].includes(rule.priority)
      ? ["Safety and asset protection rules take precedence over optimization."]
      : []
  };
}

export function normalizeTelemetryTimestamp(reading: TelemetryReading): TelemetryReading {
  const timestampUtc = new Date(reading.timestampUtc).toISOString();
  return {
    ...reading,
    timestampUtc,
    ingestionTimestampUtc: reading.ingestionTimestampUtc || new Date().toISOString()
  };
}

function evaluateCondition(condition: RuleCondition, sensors: SensorSnapshot, states: StateSnapshot): boolean {
  const actual = condition.point
    ? sensors[condition.point]?.value
    : condition.stateKey
      ? states[condition.stateKey]?.stateValue
      : undefined;

  if (actual === undefined) return false;

  switch (condition.operator) {
    case "lt":
      return Number(actual) < Number(condition.value);
    case "lte":
      return Number(actual) <= Number(condition.value);
    case "gt":
      return Number(actual) > Number(condition.value);
    case "gte":
      return Number(actual) >= Number(condition.value);
    case "eq":
      return actual === condition.value;
    case "neq":
      return actual !== condition.value;
    default:
      return false;
  }
}

function renderExplanation(rule: AutomationRule, sensors: SensorSnapshot, states: StateSnapshot): string {
  const fragments = rule.conditions.map((condition) => {
    if (condition.point) {
      const value = sensors[condition.point]?.value;
      return `${condition.point} is ${String(value)}`;
    }
    if (condition.stateKey) {
      const value = states[condition.stateKey]?.stateValue;
      return `${condition.stateKey} is ${String(value)}`;
    }
    return "condition matched";
  });

  return `${rule.name}: ${fragments.join(", ")}. ${rule.explanationTemplate}`;
}

function numericSensor(sensor: SensorSnapshotValue | undefined): number | undefined {
  if (!sensor || typeof sensor.value !== "number") return undefined;
  return sensor.value;
}

function hasBadQuality(sensors: SensorSnapshot): boolean {
  return Object.values(sensors).some((sensor) => sensor?.quality === "BAD");
}

function isOnValue(value: number | boolean | string): boolean {
  return value === true || value === 1 || String(value).toUpperCase() === "ON";
}

function minutesBetween(startUtc: string, endUtc: string): number {
  return (Date.parse(endUtc) - Date.parse(startUtc)) / 60000;
}

export function roleCanCommand(role: UserRole): boolean {
  return hasPermission(role, "command:create");
}
