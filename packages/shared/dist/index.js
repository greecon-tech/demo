"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ruleExecutionModes = exports.rulePriorityLevels = exports.stateKeys = exports.canonicalPoints = exports.rolePermissions = exports.userRoles = exports.incidentStatuses = exports.severityLevels = exports.statusLabels = exports.qualityFlags = exports.assetTypes = exports.siteTypes = exports.DEMO_TENANT_ID = exports.GREECON_PUBLIC_EMAILS = exports.GREECON_DOMAIN = exports.GREECON_COMPANY = void 0;
exports.hasPermission = hasPermission;
exports.mqttTelemetryTopic = mqttTelemetryTopic;
exports.mqttHealthTopic = mqttHealthTopic;
exports.mqttCommandTopic = mqttCommandTopic;
exports.mqttCommandAckTopic = mqttCommandAckTopic;
exports.mqttEdgeSyncTopic = mqttEdgeSyncTopic;
exports.mqttAlertTopic = mqttAlertTopic;
exports.isQualityFlag = isQualityFlag;
exports.isCanonicalPointName = isCanonicalPointName;
exports.validateTelemetryMessage = validateTelemetryMessage;
exports.GREECON_COMPANY = "Greecon Sh.p.k";
exports.GREECON_DOMAIN = "greecon.earth";
exports.GREECON_PUBLIC_EMAILS = ["info@greecon.earth", "eridon.manuka@greecon.earth"];
exports.DEMO_TENANT_ID = "11111111-1111-4111-8111-111111111111";
exports.siteTypes = [
    "farm",
    "greenhouse",
    "water_facility",
    "energy_site",
    "integrated_site",
    "demo_site"
];
exports.assetTypes = [
    "WaterSystem",
    "SolarSystem",
    "BatterySystem",
    "FarmZone",
    "Greenhouse",
    "TreatmentUnit",
    "PumpStation",
    "IrrigationZone",
    "WeatherStation",
    "Gateway"
];
exports.qualityFlags = ["OK", "WARN", "BAD"];
exports.statusLabels = [
    "OK",
    "Watch",
    "Warning",
    "Critical",
    "Offline",
    "Simulated",
    "Manual Override"
];
exports.severityLevels = ["info", "watch", "warning", "critical"];
exports.incidentStatuses = ["open", "acknowledged", "investigating", "resolved", "closed"];
exports.userRoles = ["owner", "admin", "operator", "viewer", "auditor"];
exports.rolePermissions = {
    owner: [
        "tenant:read",
        "tenant:manage",
        "site:read",
        "site:manage",
        "asset:read",
        "asset:manage",
        "device:read",
        "device:manage",
        "point:read",
        "telemetry:ingest",
        "automation:read",
        "automation:manage",
        "command:create",
        "command:approve",
        "alert:read",
        "alert:acknowledge",
        "incident:manage",
        "maintenance:manage",
        "report:export",
        "audit:read",
        "user:manage",
        "settings:manage"
    ],
    admin: [
        "tenant:read",
        "site:read",
        "site:manage",
        "asset:read",
        "asset:manage",
        "device:read",
        "device:manage",
        "point:read",
        "telemetry:ingest",
        "automation:read",
        "automation:manage",
        "command:create",
        "alert:read",
        "alert:acknowledge",
        "incident:manage",
        "maintenance:manage",
        "report:export",
        "audit:read",
        "user:manage",
        "settings:manage"
    ],
    operator: [
        "tenant:read",
        "site:read",
        "asset:read",
        "device:read",
        "point:read",
        "telemetry:ingest",
        "automation:read",
        "command:create",
        "alert:read",
        "alert:acknowledge",
        "incident:manage",
        "maintenance:manage"
    ],
    viewer: ["tenant:read", "site:read", "asset:read", "device:read", "point:read", "automation:read", "alert:read"],
    auditor: ["tenant:read", "site:read", "asset:read", "device:read", "point:read", "automation:read", "alert:read", "audit:read", "report:export"]
};
function hasPermission(role, permission) {
    return exports.rolePermissions[role].includes(permission);
}
exports.canonicalPoints = [
    "water.tank.level.percent",
    "water.flow.lpm",
    "water.pressure.bar",
    "water.pump.status",
    "water.pump.command",
    "energy.solar.power.kw",
    "energy.consumption.kw",
    "energy.battery.soc.percent",
    "energy.battery.power.kw",
    "energy.grid.import.kw",
    "energy.grid.export.kw",
    "agri.soil.moisture.percent",
    "agri.air.temperature.c",
    "agri.humidity.percent",
    "agri.irrigation.command",
    "system.gateway.online"
];
exports.stateKeys = [
    "water.tank.critical",
    "water.tank.low",
    "water.pump.dry_run_risk",
    "energy.surplus_available",
    "energy.battery.constrained",
    "agri.irrigation_required",
    "system.communication_degraded",
    "system.sensor_quality_bad"
];
exports.rulePriorityLevels = [
    "safety",
    "asset_protection",
    "compliance",
    "optimization",
    "efficiency",
    "advisory"
];
exports.ruleExecutionModes = ["edge", "cloud_assisted", "advisory", "simulation"];
function mqttTelemetryTopic(tenantId, siteId, deviceId) {
    return `greecon/${tenantId}/${siteId}/telemetry/${deviceId}`;
}
function mqttHealthTopic(tenantId, siteId, gatewayId) {
    return `greecon/${tenantId}/${siteId}/health/${gatewayId}`;
}
function mqttCommandTopic(tenantId, siteId, deviceId) {
    return `greecon/${tenantId}/${siteId}/commands/${deviceId}`;
}
function mqttCommandAckTopic(tenantId, siteId, deviceId) {
    return `greecon/${tenantId}/${siteId}/commands/${deviceId}/ack`;
}
function mqttEdgeSyncTopic(tenantId, siteId, gatewayId) {
    return `greecon/${tenantId}/${siteId}/edge/${gatewayId}/sync`;
}
function mqttAlertTopic(tenantId, siteId) {
    return `greecon/${tenantId}/${siteId}/alerts`;
}
function isQualityFlag(value) {
    return typeof value === "string" && exports.qualityFlags.includes(value);
}
function isCanonicalPointName(value) {
    return typeof value === "string" && exports.canonicalPoints.includes(value);
}
function validateTelemetryMessage(message) {
    const errors = [];
    if (message.messageType !== "telemetry")
        errors.push("messageType must be telemetry");
    if (!message.tenantId)
        errors.push("tenantId is required");
    if (!message.siteId)
        errors.push("siteId is required");
    if (!message.deviceId)
        errors.push("deviceId is required");
    if (!Array.isArray(message.readings) || message.readings.length === 0)
        errors.push("readings are required");
    for (const [index, reading] of message.readings.entries()) {
        if (!reading.timestampUtc || Number.isNaN(Date.parse(reading.timestampUtc))) {
            errors.push(`readings[${index}].timestampUtc must be an ISO UTC timestamp`);
        }
        if (reading.timestampUtc && !reading.timestampUtc.endsWith("Z")) {
            errors.push(`readings[${index}].timestampUtc must be normalized to UTC`);
        }
        if (!isCanonicalPointName(reading.canonicalName)) {
            errors.push(`readings[${index}].canonicalName is not canonical`);
        }
        if (!isQualityFlag(reading.quality)) {
            errors.push(`readings[${index}].quality must be OK, WARN, or BAD`);
        }
    }
    return errors;
}
//# sourceMappingURL=index.js.map