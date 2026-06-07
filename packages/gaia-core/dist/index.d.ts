import { AutomationRule, CanonicalPointName, CommandMessage, DerivedState, QualityFlag, RulePriorityLevel, StateKey, TelemetryReading, UserRole } from "@greecon/shared";
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
export declare const defaultSafetyLimits: SafetyLimits;
export declare function compareRulePriority(a: RulePriorityLevel, b: RulePriorityLevel): number;
export declare function requiredSensorPointsForCommand(command: CommandMessage): CanonicalPointName[];
export declare function evaluateCommandSafety(context: SafetyContext): SafetyEvaluation;
export interface DerivedStateEvaluation {
    stateKey: StateKey;
    stateValue: boolean;
    severity: "info" | "watch" | "warning" | "critical";
    confidence: number;
    reason: string;
}
export declare function deriveOperationalStates(sensors: SensorSnapshot): DerivedStateEvaluation[];
export interface RuleSimulationResult {
    ruleId: string;
    fired: boolean;
    simulated: boolean;
    priority: RulePriorityLevel;
    explanation: string;
    actions: string[];
    safetyNotes: string[];
}
export declare function simulateRule(rule: AutomationRule, sensors: SensorSnapshot, states: StateSnapshot): RuleSimulationResult;
export declare function normalizeTelemetryTimestamp(reading: TelemetryReading): TelemetryReading;
export declare function roleCanCommand(role: UserRole): boolean;
