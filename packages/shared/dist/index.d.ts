export declare const GREECON_COMPANY = "Greecon Sh.p.k";
export declare const GREECON_DOMAIN = "greecon.earth";
export declare const GREECON_PUBLIC_EMAILS: readonly ["info@greecon.earth", "eridon.manuka@greecon.earth"];
export declare const DEMO_TENANT_ID = "11111111-1111-4111-8111-111111111111";
export declare const siteTypes: readonly ["farm", "greenhouse", "water_facility", "energy_site", "integrated_site", "demo_site"];
export type SiteType = (typeof siteTypes)[number];
export declare const assetTypes: readonly ["WaterSystem", "SolarSystem", "BatterySystem", "FarmZone", "Greenhouse", "TreatmentUnit", "PumpStation", "IrrigationZone", "WeatherStation", "Gateway"];
export type AssetType = (typeof assetTypes)[number];
export declare const qualityFlags: readonly ["OK", "WARN", "BAD"];
export type QualityFlag = (typeof qualityFlags)[number];
export declare const statusLabels: readonly ["OK", "Watch", "Warning", "Critical", "Offline", "Simulated", "Manual Override"];
export type StatusLabel = (typeof statusLabels)[number];
export declare const severityLevels: readonly ["info", "watch", "warning", "critical"];
export type SeverityLevel = (typeof severityLevels)[number];
export declare const incidentStatuses: readonly ["open", "acknowledged", "investigating", "resolved", "closed"];
export type IncidentStatus = (typeof incidentStatuses)[number];
export declare const userRoles: readonly ["owner", "admin", "operator", "viewer", "auditor"];
export type UserRole = (typeof userRoles)[number];
export type Permission = "tenant:read" | "tenant:manage" | "site:read" | "site:manage" | "asset:read" | "asset:manage" | "device:read" | "device:manage" | "point:read" | "telemetry:ingest" | "automation:read" | "automation:manage" | "command:create" | "command:approve" | "alert:read" | "alert:acknowledge" | "incident:manage" | "maintenance:manage" | "report:export" | "audit:read" | "user:manage" | "settings:manage";
export declare const rolePermissions: Record<UserRole, readonly Permission[]>;
export declare function hasPermission(role: UserRole, permission: Permission): boolean;
export declare const canonicalPoints: readonly ["water.tank.level.percent", "water.flow.lpm", "water.pressure.bar", "water.pump.status", "water.pump.command", "energy.solar.power.kw", "energy.consumption.kw", "energy.battery.soc.percent", "energy.battery.power.kw", "energy.grid.import.kw", "energy.grid.export.kw", "agri.soil.moisture.percent", "agri.air.temperature.c", "agri.humidity.percent", "agri.irrigation.command", "system.gateway.online"];
export type CanonicalPointName = (typeof canonicalPoints)[number];
export declare const stateKeys: readonly ["water.tank.critical", "water.tank.low", "water.pump.dry_run_risk", "energy.surplus_available", "energy.battery.constrained", "agri.irrigation_required", "system.communication_degraded", "system.sensor_quality_bad"];
export type StateKey = (typeof stateKeys)[number];
export interface Tenant {
    id: string;
    name: string;
    domain: string;
    status: "active" | "suspended";
}
export interface User {
    id: string;
    tenantId: string;
    email: string;
    name: string;
    role: UserRole;
    status: "active" | "disabled";
}
export interface Site {
    id: string;
    tenantId: string;
    name: string;
    type: SiteType;
    locationName: string;
    latitude?: number;
    longitude?: number;
    status: StatusLabel;
    edgeStatus: StatusLabel;
}
export interface Asset {
    id: string;
    tenantId: string;
    siteId: string;
    name: string;
    type: AssetType;
    status: StatusLabel;
}
export interface Device {
    id: string;
    tenantId: string;
    siteId: string;
    assetId?: string;
    gatewayId?: string;
    name: string;
    deviceType: string;
    protocol: "modbus" | "opc_ua" | "vendor_api" | "analog" | "simulated";
    driverType: string;
    health: StatusLabel;
    lastSeenUtc?: string;
    firmwareVersion?: string;
    secureIdentityStatus: "placeholder" | "provisioned" | "revoked";
}
export interface Point {
    id: string;
    tenantId: string;
    siteId: string;
    assetId?: string;
    deviceId: string;
    canonicalName: CanonicalPointName;
    label: string;
    unit: string;
    quality: QualityFlag;
    capability: "read" | "write" | "read_write";
    thresholdConfig?: Record<string, number>;
    metadata?: Record<string, string | number | boolean>;
}
export interface TelemetryReading {
    timestampUtc: string;
    tenantId: string;
    siteId: string;
    assetId?: string;
    deviceId: string;
    pointId: string;
    canonicalName: CanonicalPointName;
    value: number | boolean | string;
    unit: string;
    quality: QualityFlag;
    source: "edge" | "cloud" | "simulator" | "manual";
    ingestionTimestampUtc: string;
}
export interface DerivedState {
    id: string;
    tenantId: string;
    siteId: string;
    assetId?: string;
    stateKey: StateKey;
    stateValue: boolean | number | string;
    severity: SeverityLevel;
    confidence: number;
    reason: string;
    sourceTelemetryRefs?: string[];
    createdAtUtc: string;
    updatedAtUtc: string;
}
export declare const rulePriorityLevels: readonly ["safety", "asset_protection", "compliance", "optimization", "efficiency", "advisory"];
export type RulePriorityLevel = (typeof rulePriorityLevels)[number];
export declare const ruleExecutionModes: readonly ["edge", "cloud_assisted", "advisory", "simulation"];
export type RuleExecutionMode = (typeof ruleExecutionModes)[number];
export interface RuleCondition {
    point?: CanonicalPointName;
    stateKey?: StateKey;
    operator: "lt" | "lte" | "gt" | "gte" | "eq" | "neq";
    value: number | boolean | string;
}
export interface RuleAction {
    type: "command" | "alert" | "recommendation";
    targetCanonicalName?: CanonicalPointName;
    value?: number | boolean | string;
    message: string;
}
export interface AutomationRule {
    id: string;
    tenantId: string;
    siteId?: string;
    name: string;
    priority: RulePriorityLevel;
    triggerType: "threshold" | "schedule" | "trend" | "multi_variable" | "forecast" | "constraint" | "failsafe";
    conditions: RuleCondition[];
    constraints: RuleCondition[];
    actions: RuleAction[];
    executionMode: RuleExecutionMode;
    explanationTemplate: string;
    rollbackBehavior: string;
    enabled: boolean;
    approvalState: "draft" | "approved" | "disabled";
    version: number;
    createdBy: string;
    updatedBy: string;
}
export interface CommandTarget {
    deviceId: string;
    pointId: string;
    canonicalName: CanonicalPointName;
}
export interface CommandMessage {
    messageType: "command";
    commandId: string;
    tenantId: string;
    siteId: string;
    target: CommandTarget;
    requestedValue: number | boolean | string;
    requestedBy: string;
    requestedByRole: UserRole;
    reason: string;
    manualOverride?: {
        durationMinutes: number;
        expiresAtUtc: string;
    };
    issuedAtUtc: string;
    correlationId: string;
}
export interface CommandAckMessage {
    messageType: "command_ack";
    commandId: string;
    tenantId: string;
    siteId: string;
    deviceId: string;
    status: "accepted" | "rejected" | "executed" | "failed";
    acknowledgementUtc: string;
    result?: string;
    failureReason?: string;
    correlationId: string;
}
export interface TelemetryMessage {
    messageType: "telemetry";
    tenantId: string;
    siteId: string;
    deviceId: string;
    readings: TelemetryReading[];
    publishedAtUtc: string;
    correlationId: string;
}
export interface DeviceHealthMessage {
    messageType: "device_health";
    tenantId: string;
    siteId: string;
    gatewayId: string;
    status: StatusLabel;
    lastSeenUtc: string;
    softwareVersion?: string;
    bufferedReadings: number;
    clockDriftMs: number;
    correlationId: string;
}
export interface EdgeSyncMessage {
    messageType: "edge_sync";
    tenantId: string;
    siteId: string;
    gatewayId: string;
    batchId: string;
    startedAtUtc: string;
    completedAtUtc?: string;
    bufferedReadings: number;
    status: "started" | "completed" | "failed";
    correlationId: string;
}
export interface AlertMessage {
    messageType: "alert";
    alertId: string;
    tenantId: string;
    siteId: string;
    assetId?: string;
    category: "equipment_failure" | "sensor_quality_degradation" | "resource_threshold" | "water_tank_critical" | "pump_dry_run_risk" | "overpressure" | "battery_constrained" | "communication_degraded" | "site_offline" | "rule_conflict" | "manual_override_active";
    severity: SeverityLevel;
    title: string;
    suggestedAction: string;
    createdAtUtc: string;
    correlationId: string;
}
export declare function mqttTelemetryTopic(tenantId: string, siteId: string, deviceId: string): string;
export declare function mqttHealthTopic(tenantId: string, siteId: string, gatewayId: string): string;
export declare function mqttCommandTopic(tenantId: string, siteId: string, deviceId: string): string;
export declare function mqttCommandAckTopic(tenantId: string, siteId: string, deviceId: string): string;
export declare function mqttEdgeSyncTopic(tenantId: string, siteId: string, gatewayId: string): string;
export declare function mqttAlertTopic(tenantId: string, siteId: string): string;
export declare function isQualityFlag(value: unknown): value is QualityFlag;
export declare function isCanonicalPointName(value: unknown): value is CanonicalPointName;
export declare function validateTelemetryMessage(message: TelemetryMessage): string[];
