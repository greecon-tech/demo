import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  AlertMessage,
  Asset,
  AutomationRule,
  CommandAckMessage,
  CommandMessage,
  DEMO_TENANT_ID,
  DerivedState,
  Device,
  EdgeSyncMessage,
  Point,
  Site,
  TelemetryMessage,
  TelemetryReading,
  Tenant,
  User,
  UserRole,
  hasPermission,
  validateTelemetryMessage
} from "@greecon/shared";
import {
  defaultSafetyLimits,
  deriveOperationalStates,
  evaluateCommandSafety,
  normalizeTelemetryTimestamp,
  simulateRule,
  type SensorSnapshot,
  type StateSnapshot
} from "@greecon/gaia-core";
import { Principal } from "../common/principal";

export interface CommandRecord {
  id: string;
  tenantId: string;
  siteId: string;
  targetDeviceId: string;
  targetPointId: string;
  canonicalName: string;
  requestedValue: number | boolean | string;
  requestedBy: string;
  requestedByRole: UserRole;
  reason: string;
  safetyEvaluation: ReturnType<typeof evaluateCommandSafety>;
  dispatchStatus: "blocked" | "simulated_dispatch" | "acknowledged" | "failed";
  acknowledgement?: CommandAckMessage;
  result?: string;
  failureReason?: string;
  rollbackStatus?: string;
  auditEventId: string;
  createdAtUtc: string;
}

export interface AlertRecord {
  id: string;
  tenantId: string;
  siteId: string;
  assetId?: string;
  category: AlertMessage["category"];
  severity: AlertMessage["severity"];
  status: "open" | "acknowledged" | "resolved";
  title: string;
  suggestedAction: string;
  createdAtUtc: string;
}

export interface IncidentRecord {
  id: string;
  tenantId: string;
  siteId: string;
  alertId?: string;
  status: "open" | "acknowledged" | "investigating" | "resolved" | "closed";
  severity: AlertMessage["severity"];
  title: string;
  investigationNotes?: string;
  updatedAtUtc: string;
}

export interface MaintenanceTask {
  id: string;
  tenantId: string;
  siteId: string;
  assetId?: string;
  incidentId?: string;
  title: string;
  notes?: string;
  dueAtUtc?: string;
  status: "open" | "complete";
}

export interface AuditEvent {
  id: string;
  tenantId: string;
  userId: string;
  eventType: string;
  siteId?: string;
  assetId?: string;
  entityType: string;
  entityId?: string;
  beforeMetadata?: Record<string, unknown>;
  afterMetadata?: Record<string, unknown>;
  reason?: string;
  createdAtUtc: string;
}

export interface CreateCommandInput {
  siteId: string;
  targetDeviceId: string;
  targetPointId: string;
  requestedValue: number | boolean | string;
  reason: string;
  manualOverride?: {
    durationMinutes: number;
    reason: string;
  };
}

export interface ReportExportInput {
  siteId?: string;
  reportType: "operational" | "sustainability" | "audit" | "incident";
  parameters?: Record<string, string | number | boolean>;
}

export interface EdgeSyncInput {
  siteId: string;
  gatewayId: string;
  status: EdgeSyncMessage["status"];
  bufferedReadings: number;
  startedAtUtc: string;
  completedAtUtc?: string;
}

@Injectable()
export class PlatformService {
  private readonly tenants: Tenant[] = [
    { id: DEMO_TENANT_ID, name: "Greecon Demo", domain: "demo.greecon.earth", status: "active" }
  ];

  private readonly users: User[] = [
    {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      tenantId: DEMO_TENANT_ID,
      email: "eridon.manuka@greecon.earth",
      name: "Eridon Manuka",
      role: "owner",
      status: "active"
    },
    {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
      tenantId: DEMO_TENANT_ID,
      email: "operator@greecon.earth",
      name: "Demo Operator",
      role: "operator",
      status: "active"
    },
    {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
      tenantId: DEMO_TENANT_ID,
      email: "auditor@greecon.earth",
      name: "Demo Auditor",
      role: "auditor",
      status: "active"
    }
  ];

  private readonly sites: Site[] = [
    {
      id: "22222222-2222-4222-8222-222222222201",
      tenantId: DEMO_TENANT_ID,
      name: "Integrated Farm Site",
      type: "integrated_site",
      locationName: "Durana Tech Park, Albania",
      latitude: 41.368786,
      longitude: 19.615673,
      status: "OK",
      edgeStatus: "OK"
    },
    {
      id: "22222222-2222-4222-8222-222222222202",
      tenantId: DEMO_TENANT_ID,
      name: "Water Management Site",
      type: "water_facility",
      locationName: "Albania",
      status: "Watch",
      edgeStatus: "OK"
    },
    {
      id: "22222222-2222-4222-8222-222222222203",
      tenantId: DEMO_TENANT_ID,
      name: "Solar + Battery Site",
      type: "energy_site",
      locationName: "Albania",
      status: "OK",
      edgeStatus: "Simulated"
    }
  ];

  private readonly assets: Asset[] = [
    { id: "33333333-3333-4333-8333-333333333301", tenantId: DEMO_TENANT_ID, siteId: "22222222-2222-4222-8222-222222222201", name: "Solar Array A", type: "SolarSystem", status: "OK" },
    { id: "33333333-3333-4333-8333-333333333302", tenantId: DEMO_TENANT_ID, siteId: "22222222-2222-4222-8222-222222222203", name: "Battery Bank A", type: "BatterySystem", status: "OK" },
    { id: "33333333-3333-4333-8333-333333333303", tenantId: DEMO_TENANT_ID, siteId: "22222222-2222-4222-8222-222222222202", name: "Primary Water Tank", type: "WaterSystem", status: "Watch" },
    { id: "33333333-3333-4333-8333-333333333304", tenantId: DEMO_TENANT_ID, siteId: "22222222-2222-4222-8222-222222222202", name: "Pump Station North", type: "PumpStation", status: "OK" },
    { id: "33333333-3333-4333-8333-333333333305", tenantId: DEMO_TENANT_ID, siteId: "22222222-2222-4222-8222-222222222201", name: "Irrigation Zone 1", type: "IrrigationZone", status: "OK" },
    { id: "33333333-3333-4333-8333-333333333306", tenantId: DEMO_TENANT_ID, siteId: "22222222-2222-4222-8222-222222222201", name: "Greenhouse Block A", type: "Greenhouse", status: "OK" },
    { id: "33333333-3333-4333-8333-333333333307", tenantId: DEMO_TENANT_ID, siteId: "22222222-2222-4222-8222-222222222201", name: "Weather Station", type: "WeatherStation", status: "OK" }
  ];

  private readonly devices: Device[] = [
    {
      id: "44444444-4444-4444-8444-444444444401",
      tenantId: DEMO_TENANT_ID,
      siteId: "22222222-2222-4222-8222-222222222201",
      assetId: "33333333-3333-4333-8333-333333333301",
      gatewayId: "77777777-7777-4777-8777-777777777701",
      name: "Solar Inverter A",
      deviceType: "inverter",
      protocol: "simulated",
      driverType: "simulated-solar-driver",
      health: "OK",
      lastSeenUtc: nowIso(),
      firmwareVersion: "sim-1.0.0",
      secureIdentityStatus: "placeholder"
    },
    {
      id: "44444444-4444-4444-8444-444444444402",
      tenantId: DEMO_TENANT_ID,
      siteId: "22222222-2222-4222-8222-222222222203",
      assetId: "33333333-3333-4333-8333-333333333302",
      gatewayId: "77777777-7777-4777-8777-777777777703",
      name: "Battery Controller A",
      deviceType: "battery_controller",
      protocol: "simulated",
      driverType: "simulated-battery-driver",
      health: "OK",
      lastSeenUtc: nowIso(),
      firmwareVersion: "sim-1.0.0",
      secureIdentityStatus: "placeholder"
    },
    {
      id: "44444444-4444-4444-8444-444444444403",
      tenantId: DEMO_TENANT_ID,
      siteId: "22222222-2222-4222-8222-222222222202",
      assetId: "33333333-3333-4333-8333-333333333303",
      gatewayId: "77777777-7777-4777-8777-777777777702",
      name: "Tank Level Sensor",
      deviceType: "level_sensor",
      protocol: "simulated",
      driverType: "simulated-water-driver",
      health: "OK",
      lastSeenUtc: nowIso(),
      firmwareVersion: "sim-1.0.0",
      secureIdentityStatus: "placeholder"
    },
    {
      id: "44444444-4444-4444-8444-444444444404",
      tenantId: DEMO_TENANT_ID,
      siteId: "22222222-2222-4222-8222-222222222202",
      assetId: "33333333-3333-4333-8333-333333333304",
      gatewayId: "77777777-7777-4777-8777-777777777702",
      name: "Pump Station PLC",
      deviceType: "plc",
      protocol: "simulated",
      driverType: "simulated-pump-driver",
      health: "OK",
      lastSeenUtc: nowIso(),
      firmwareVersion: "sim-1.0.0",
      secureIdentityStatus: "placeholder"
    },
    {
      id: "44444444-4444-4444-8444-444444444405",
      tenantId: DEMO_TENANT_ID,
      siteId: "22222222-2222-4222-8222-222222222201",
      assetId: "33333333-3333-4333-8333-333333333305",
      gatewayId: "77777777-7777-4777-8777-777777777701",
      name: "Irrigation Controller",
      deviceType: "irrigation_controller",
      protocol: "simulated",
      driverType: "simulated-irrigation-driver",
      health: "OK",
      lastSeenUtc: nowIso(),
      firmwareVersion: "sim-1.0.0",
      secureIdentityStatus: "placeholder"
    },
    {
      id: "44444444-4444-4444-8444-444444444406",
      tenantId: DEMO_TENANT_ID,
      siteId: "22222222-2222-4222-8222-222222222201",
      assetId: "33333333-3333-4333-8333-333333333307",
      gatewayId: "77777777-7777-4777-8777-777777777701",
      name: "Weather Station Node",
      deviceType: "weather_station",
      protocol: "simulated",
      driverType: "simulated-climate-driver",
      health: "OK",
      lastSeenUtc: nowIso(),
      firmwareVersion: "sim-1.0.0",
      secureIdentityStatus: "placeholder"
    }
  ];

  private readonly points: Point[] = [
    { id: "55555555-5555-4555-8555-555555555501", tenantId: DEMO_TENANT_ID, siteId: "22222222-2222-4222-8222-222222222201", assetId: "33333333-3333-4333-8333-333333333301", deviceId: "44444444-4444-4444-8444-444444444401", canonicalName: "energy.solar.power.kw", label: "Solar production", unit: "kW", quality: "OK", capability: "read", thresholdConfig: { watch_low: 2 } },
    { id: "55555555-5555-4555-8555-555555555502", tenantId: DEMO_TENANT_ID, siteId: "22222222-2222-4222-8222-222222222203", assetId: "33333333-3333-4333-8333-333333333302", deviceId: "44444444-4444-4444-8444-444444444402", canonicalName: "energy.battery.soc.percent", label: "Battery SOC", unit: "%", quality: "OK", capability: "read", thresholdConfig: { warning_low: 25 } },
    { id: "55555555-5555-4555-8555-555555555503", tenantId: DEMO_TENANT_ID, siteId: "22222222-2222-4222-8222-222222222202", assetId: "33333333-3333-4333-8333-333333333303", deviceId: "44444444-4444-4444-8444-444444444403", canonicalName: "water.tank.level.percent", label: "Tank level", unit: "%", quality: "WARN", capability: "read", thresholdConfig: { critical_low: 15, warning_low: 35 } },
    { id: "55555555-5555-4555-8555-555555555504", tenantId: DEMO_TENANT_ID, siteId: "22222222-2222-4222-8222-222222222202", assetId: "33333333-3333-4333-8333-333333333304", deviceId: "44444444-4444-4444-8444-444444444404", canonicalName: "water.flow.lpm", label: "Pump flow", unit: "lpm", quality: "OK", capability: "read", thresholdConfig: { dry_run_lpm: 0.2 } },
    { id: "55555555-5555-4555-8555-555555555505", tenantId: DEMO_TENANT_ID, siteId: "22222222-2222-4222-8222-222222222202", assetId: "33333333-3333-4333-8333-333333333304", deviceId: "44444444-4444-4444-8444-444444444404", canonicalName: "water.pressure.bar", label: "Line pressure", unit: "bar", quality: "OK", capability: "read", thresholdConfig: { max_bar: 5.5 } },
    { id: "55555555-5555-4555-8555-555555555506", tenantId: DEMO_TENANT_ID, siteId: "22222222-2222-4222-8222-222222222201", assetId: "33333333-3333-4333-8333-333333333305", deviceId: "44444444-4444-4444-8444-444444444405", canonicalName: "agri.soil.moisture.percent", label: "Soil moisture", unit: "%", quality: "OK", capability: "read", thresholdConfig: { irrigate_below: 28 } },
    { id: "55555555-5555-4555-8555-555555555507", tenantId: DEMO_TENANT_ID, siteId: "22222222-2222-4222-8222-222222222201", assetId: "33333333-3333-4333-8333-333333333307", deviceId: "44444444-4444-4444-8444-444444444406", canonicalName: "agri.air.temperature.c", label: "Air temperature", unit: "C", quality: "OK", capability: "read" },
    { id: "55555555-5555-4555-8555-555555555508", tenantId: DEMO_TENANT_ID, siteId: "22222222-2222-4222-8222-222222222201", assetId: "33333333-3333-4333-8333-333333333307", deviceId: "44444444-4444-4444-8444-444444444406", canonicalName: "agri.humidity.percent", label: "Humidity", unit: "%", quality: "OK", capability: "read" },
    { id: "55555555-5555-4555-8555-555555555509", tenantId: DEMO_TENANT_ID, siteId: "22222222-2222-4222-8222-222222222202", assetId: "33333333-3333-4333-8333-333333333304", deviceId: "44444444-4444-4444-8444-444444444404", canonicalName: "water.pump.command", label: "Pump command", unit: "state", quality: "OK", capability: "write" }
  ];

  private telemetry: TelemetryReading[] = [
    reading("22222222-2222-4222-8222-222222222201", "33333333-3333-4333-8333-333333333301", "44444444-4444-4444-8444-444444444401", "55555555-5555-4555-8555-555555555501", "energy.solar.power.kw", 18.6, "kW", "OK", 10),
    reading("22222222-2222-4222-8222-222222222203", "33333333-3333-4333-8333-333333333302", "44444444-4444-4444-8444-444444444402", "55555555-5555-4555-8555-555555555502", "energy.battery.soc.percent", 68, "%", "OK", 9),
    reading("22222222-2222-4222-8222-222222222202", "33333333-3333-4333-8333-333333333303", "44444444-4444-4444-8444-444444444403", "55555555-5555-4555-8555-555555555503", "water.tank.level.percent", 38, "%", "WARN", 8),
    reading("22222222-2222-4222-8222-222222222202", "33333333-3333-4333-8333-333333333304", "44444444-4444-4444-8444-444444444404", "55555555-5555-4555-8555-555555555504", "water.flow.lpm", 11.7, "lpm", "OK", 7),
    reading("22222222-2222-4222-8222-222222222202", "33333333-3333-4333-8333-333333333304", "44444444-4444-4444-8444-444444444404", "55555555-5555-4555-8555-555555555505", "water.pressure.bar", 2.8, "bar", "OK", 6),
    reading("22222222-2222-4222-8222-222222222201", "33333333-3333-4333-8333-333333333305", "44444444-4444-4444-8444-444444444405", "55555555-5555-4555-8555-555555555506", "agri.soil.moisture.percent", 24, "%", "OK", 5),
    reading("22222222-2222-4222-8222-222222222201", "33333333-3333-4333-8333-333333333307", "44444444-4444-4444-8444-444444444406", "55555555-5555-4555-8555-555555555507", "agri.air.temperature.c", 24.5, "C", "OK", 4),
    reading("22222222-2222-4222-8222-222222222201", "33333333-3333-4333-8333-333333333307", "44444444-4444-4444-8444-444444444406", "55555555-5555-4555-8555-555555555508", "agri.humidity.percent", 62, "%", "OK", 3)
  ];

  private derivedStates: DerivedState[] = [
    state("water.tank.low", true, "warning", "22222222-2222-4222-8222-222222222202", "33333333-3333-4333-8333-333333333303", "Tank level is below the refill planning threshold."),
    state("energy.surplus_available", true, "watch", "22222222-2222-4222-8222-222222222201", "33333333-3333-4333-8333-333333333301", "Solar production is above current load estimate."),
    state("agri.irrigation_required", true, "watch", "22222222-2222-4222-8222-222222222201", "33333333-3333-4333-8333-333333333305", "Soil moisture is below the irrigation threshold.")
  ];

  private readonly rules: AutomationRule[] = demoRules();
  private readonly commands: CommandRecord[] = [];
  private readonly reportExports: Array<ReportExportInput & { id: string; status: string; requestedBy: string; createdAtUtc: string }> = [];
  private readonly edgeSyncBatches: Array<EdgeSyncInput & { id: string; tenantId: string; createdAtUtc: string }> = [];

  private readonly alerts: AlertRecord[] = [
    {
      id: "99999999-9999-4999-8999-999999999901",
      tenantId: DEMO_TENANT_ID,
      siteId: "22222222-2222-4222-8222-222222222202",
      assetId: "33333333-3333-4333-8333-333333333303",
      category: "resource_threshold",
      severity: "warning",
      status: "open",
      title: "Water tank approaching low threshold",
      suggestedAction: "Review refill timing and solar surplus availability.",
      createdAtUtc: nowIso()
    },
    {
      id: "99999999-9999-4999-8999-999999999902",
      tenantId: DEMO_TENANT_ID,
      siteId: "22222222-2222-4222-8222-222222222201",
      assetId: "33333333-3333-4333-8333-333333333305",
      category: "resource_threshold",
      severity: "watch",
      status: "open",
      title: "Soil moisture below irrigation threshold",
      suggestedAction: "Simulate irrigation rule and confirm safety conditions.",
      createdAtUtc: nowIso()
    }
  ];

  private readonly incidents: IncidentRecord[] = [
    {
      id: "abababab-abab-4aba-8aba-ababababab01",
      tenantId: DEMO_TENANT_ID,
      siteId: "22222222-2222-4222-8222-222222222202",
      alertId: "99999999-9999-4999-8999-999999999901",
      status: "acknowledged",
      severity: "warning",
      title: "Water storage planning review",
      investigationNotes: "Demo incident linked to low tank alert.",
      updatedAtUtc: nowIso()
    }
  ];

  private readonly maintenanceTasks: MaintenanceTask[] = [
    {
      id: "cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcd01",
      tenantId: DEMO_TENANT_ID,
      siteId: "22222222-2222-4222-8222-222222222202",
      assetId: "33333333-3333-4333-8333-333333333304",
      incidentId: "abababab-abab-4aba-8aba-ababababab01",
      title: "Inspect pump station pressure sensor",
      notes: "Confirm pressure sensor calibration before enabling cloud-assisted pump rules.",
      dueAtUtc: addDaysIso(7),
      status: "open"
    }
  ];

  private readonly auditEvents: AuditEvent[] = [
    audit("rule.approved", "rule", "88888888-8888-4888-8888-888888888801", "Initial MVP safety baseline.", "22222222-2222-4222-8222-222222222202", "33333333-3333-4333-8333-333333333304"),
    audit("rule.approved", "rule", "88888888-8888-4888-8888-888888888802", "Initial MVP safety baseline.", "22222222-2222-4222-8222-222222222202", "33333333-3333-4333-8333-333333333304"),
    audit("alert.acknowledged", "alert", "99999999-9999-4999-8999-999999999901", "Operator acknowledged demo low tank alert.", "22222222-2222-4222-8222-222222222202", "33333333-3333-4333-8333-333333333303")
  ];

  session(principal: Principal) {
    return {
      principal,
      company: "Greecon Sh.p.k",
      domain: "greecon.earth",
      publicEmails: ["info@greecon.earth", "eridon.manuka@greecon.earth"],
      access: {
        canCommand: hasPermission(principal.role, "command:create"),
        canManageRules: hasPermission(principal.role, "automation:manage"),
        canReadAudit: hasPermission(principal.role, "audit:read")
      }
    };
  }

  listTenants(principal: Principal): Tenant[] {
    return this.tenants.filter((tenant) => tenant.id === principal.tenantId);
  }

  listUsers(principal: Principal): User[] {
    return this.scope(this.users, principal.tenantId);
  }

  overview(principal: Principal) {
    const tenantSites = this.listSites(principal);
    const activeAlerts = this.listAlerts(principal).filter((alert) => alert.status === "open");
    return {
      tenant: this.requireTenant(principal.tenantId),
      status: "System stable",
      sites: tenantSites,
      summaries: {
        energy: {
          solarPowerKw: this.latestNumber("energy.solar.power.kw"),
          batterySocPercent: this.latestNumber("energy.battery.soc.percent"),
          surplusState: this.stateValue("energy.surplus_available") ? "Available" : "Constrained"
        },
        water: {
          tankLevelPercent: this.latestNumber("water.tank.level.percent"),
          flowLpm: this.latestNumber("water.flow.lpm"),
          pressureBar: this.latestNumber("water.pressure.bar")
        },
        agriculture: {
          soilMoisturePercent: this.latestNumber("agri.soil.moisture.percent"),
          temperatureC: this.latestNumber("agri.air.temperature.c"),
          humidityPercent: this.latestNumber("agri.humidity.percent")
        },
        automation: {
          enabledRules: this.rules.filter((rule) => rule.tenantId === principal.tenantId && rule.enabled).length,
          simulatedRules: this.rules.filter((rule) => rule.tenantId === principal.tenantId && rule.executionMode === "simulation").length,
          lastAction: this.commands[0]?.dispatchStatus ?? "No command dispatched"
        },
        edge: {
          connectedSites: tenantSites.filter((site) => site.edgeStatus === "OK").length,
          simulatedSites: tenantSites.filter((site) => site.edgeStatus === "Simulated").length
        }
      },
      activeAlerts
    };
  }

  listSites(principal: Principal): Site[] {
    return this.scope(this.sites, principal.tenantId);
  }

  siteDetail(siteId: string, principal: Principal) {
    const site = this.requireSite(siteId, principal.tenantId);
    return {
      site,
      assets: this.assets.filter((asset) => asset.tenantId === principal.tenantId && asset.siteId === siteId),
      devices: this.devices.filter((device) => device.tenantId === principal.tenantId && device.siteId === siteId),
      points: this.points.filter((point) => point.tenantId === principal.tenantId && point.siteId === siteId),
      latestTelemetry: this.latestTelemetry(principal, siteId),
      derivedStates: this.listDerivedStates(principal, siteId),
      alerts: this.listAlerts(principal, siteId),
      rules: this.listRules(principal, siteId),
      audit: this.listAudit(principal, siteId)
    };
  }

  listAssets(principal: Principal, siteId?: string): Asset[] {
    return this.scope(this.assets, principal.tenantId).filter((asset) => !siteId || asset.siteId === siteId);
  }

  listDevices(principal: Principal, siteId?: string): Device[] {
    return this.scope(this.devices, principal.tenantId).filter((device) => !siteId || device.siteId === siteId);
  }

  listPoints(principal: Principal, deviceId?: string): Point[] {
    return this.scope(this.points, principal.tenantId).filter((point) => !deviceId || point.deviceId === deviceId);
  }

  latestTelemetry(principal: Principal, siteId?: string): TelemetryReading[] {
    return this.latestReadings(this.telemetry.filter((readingValue) => readingValue.tenantId === principal.tenantId && (!siteId || readingValue.siteId === siteId)));
  }

  ingestTelemetry(message: TelemetryMessage, principal: Principal) {
    if (principal.tenantId !== message.tenantId) {
      throw new ForbiddenException("Telemetry tenant does not match request context.");
    }

    const errors = validateTelemetryMessage(message);
    if (errors.length > 0) {
      return {
        accepted: false,
        errors
      };
    }

    const normalized = message.readings.map((item) => normalizeTelemetryTimestamp(item));
    for (const item of normalized) {
      this.requireSite(item.siteId, principal.tenantId);
      this.telemetry.push(item);
      const point = this.points.find((candidate) => candidate.id === item.pointId && candidate.tenantId === principal.tenantId);
      if (point) point.quality = item.quality;
    }

    this.refreshDerivedStates(principal.tenantId, message.siteId);

    return {
      accepted: true,
      ingested: normalized.length,
      errors: []
    };
  }

  listDerivedStates(principal: Principal, siteId?: string): DerivedState[] {
    return this.scope(this.derivedStates, principal.tenantId).filter((stateValue) => !siteId || stateValue.siteId === siteId);
  }

  listRules(principal: Principal, siteId?: string): AutomationRule[] {
    return this.scope(this.rules, principal.tenantId).filter((rule) => !siteId || !rule.siteId || rule.siteId === siteId);
  }

  simulateRules(principal: Principal, siteId?: string) {
    const sensors = this.sensorSnapshot(principal.tenantId, siteId);
    const states = this.stateSnapshot(principal.tenantId, siteId);
    return this.listRules(principal, siteId).map((rule) => simulateRule(rule, sensors, states));
  }

  createCommand(input: CreateCommandInput, principal: Principal): CommandRecord {
    if (!hasPermission(principal.role, "command:create")) {
      throw new ForbiddenException("Action blocked by access policy.");
    }

    const device = this.requireDevice(input.targetDeviceId, principal.tenantId);
    const point = this.requirePoint(input.targetPointId, principal.tenantId);
    this.requireSite(input.siteId, principal.tenantId);

    if (device.siteId !== input.siteId || point.deviceId !== device.id) {
      throw new ForbiddenException("Command target is outside the selected site/device scope.");
    }

    const issuedAtUtc = nowIso();
    const commandMessage: CommandMessage = {
      messageType: "command",
      commandId: randomUUID(),
      tenantId: principal.tenantId,
      siteId: input.siteId,
      target: {
        deviceId: device.id,
        pointId: point.id,
        canonicalName: point.canonicalName
      },
      requestedValue: input.requestedValue,
      requestedBy: principal.userId,
      requestedByRole: principal.role,
      reason: input.manualOverride?.reason ?? input.reason,
      manualOverride: input.manualOverride
        ? {
            durationMinutes: input.manualOverride.durationMinutes,
            expiresAtUtc: addMinutesIso(input.manualOverride.durationMinutes)
          }
        : undefined,
      issuedAtUtc,
      correlationId: randomUUID()
    };

    const safetyEvaluation = evaluateCommandSafety({
      command: commandMessage,
      sensors: this.sensorSnapshot(principal.tenantId, input.siteId),
      states: this.stateSnapshot(principal.tenantId, input.siteId),
      limits: defaultSafetyLimits,
      systemMode: "automatic"
    });

    const auditEvent = this.recordAudit({
      tenantId: principal.tenantId,
      userId: principal.userId,
      eventType: safetyEvaluation.allowed ? "command.simulated_dispatch" : "command.blocked",
      siteId: input.siteId,
      assetId: point.assetId,
      entityType: "command",
      afterMetadata: {
        requestedValue: input.requestedValue,
        safetyEvaluation
      },
      reason: commandMessage.reason
    });

    const record: CommandRecord = {
      id: commandMessage.commandId,
      tenantId: principal.tenantId,
      siteId: input.siteId,
      targetDeviceId: device.id,
      targetPointId: point.id,
      canonicalName: point.canonicalName,
      requestedValue: input.requestedValue,
      requestedBy: principal.userId,
      requestedByRole: principal.role,
      reason: commandMessage.reason,
      safetyEvaluation,
      dispatchStatus: safetyEvaluation.allowed ? "simulated_dispatch" : "blocked",
      failureReason: safetyEvaluation.allowed ? undefined : safetyEvaluation.reasons.join(" "),
      rollbackStatus: safetyEvaluation.allowed ? "not_required" : "not_dispatched",
      auditEventId: auditEvent.id,
      createdAtUtc: issuedAtUtc
    };

    this.commands.unshift(record);

    if (input.manualOverride) {
      this.recordAudit({
        tenantId: principal.tenantId,
        userId: principal.userId,
        eventType: "manual_override.requested",
        siteId: input.siteId,
        assetId: point.assetId,
        entityType: "manual_override",
        entityId: record.id,
        afterMetadata: {
          durationMinutes: input.manualOverride.durationMinutes,
          expiresAtUtc: commandMessage.manualOverride?.expiresAtUtc,
          safetyEvaluation
        },
        reason: input.manualOverride.reason
      });
    }

    return record;
  }

  listCommands(principal: Principal): CommandRecord[] {
    return this.scope(this.commands, principal.tenantId);
  }

  acknowledgeCommand(commandId: string, ack: CommandAckMessage, principal: Principal): CommandRecord {
    const command = this.commands.find((candidate) => candidate.id === commandId && candidate.tenantId === principal.tenantId);
    if (!command) throw new NotFoundException("Command not found.");

    command.acknowledgement = ack;
    command.dispatchStatus = ack.status === "failed" || ack.status === "rejected" ? "failed" : "acknowledged";
    command.failureReason = ack.failureReason;
    command.result = ack.result;

    this.recordAudit({
      tenantId: principal.tenantId,
      userId: principal.userId,
      eventType: "command.acknowledged",
      siteId: command.siteId,
      entityType: "command",
      entityId: command.id,
      afterMetadata: { acknowledgement: ack },
      reason: ack.failureReason ?? ack.result ?? "Command acknowledgement received."
    });

    return command;
  }

  listAlerts(principal: Principal, siteId?: string): AlertRecord[] {
    return this.scope(this.alerts, principal.tenantId).filter((alert) => !siteId || alert.siteId === siteId);
  }

  acknowledgeAlert(alertId: string, principal: Principal): AlertRecord {
    const alert = this.alerts.find((candidate) => candidate.id === alertId && candidate.tenantId === principal.tenantId);
    if (!alert) throw new NotFoundException("Alert not found.");
    const before = { status: alert.status };
    alert.status = "acknowledged";

    this.recordAudit({
      tenantId: principal.tenantId,
      userId: principal.userId,
      eventType: "alert.acknowledged",
      siteId: alert.siteId,
      assetId: alert.assetId,
      entityType: "alert",
      entityId: alert.id,
      beforeMetadata: before,
      afterMetadata: { status: alert.status },
      reason: "Alert acknowledged by operator."
    });

    return alert;
  }

  listIncidents(principal: Principal): IncidentRecord[] {
    return this.scope(this.incidents, principal.tenantId);
  }

  updateIncidentStatus(id: string, status: IncidentRecord["status"], principal: Principal): IncidentRecord {
    const incident = this.incidents.find((candidate) => candidate.id === id && candidate.tenantId === principal.tenantId);
    if (!incident) throw new NotFoundException("Incident not found.");
    const before = { status: incident.status };
    incident.status = status;
    incident.updatedAtUtc = nowIso();
    this.recordAudit({
      tenantId: principal.tenantId,
      userId: principal.userId,
      eventType: "incident.status_changed",
      siteId: incident.siteId,
      entityType: "incident",
      entityId: incident.id,
      beforeMetadata: before,
      afterMetadata: { status },
      reason: "Incident lifecycle updated."
    });
    return incident;
  }

  listMaintenance(principal: Principal): MaintenanceTask[] {
    return this.scope(this.maintenanceTasks, principal.tenantId);
  }

  reportTemplates() {
    return [
      "Operational report",
      "Sustainability report",
      "Audit report",
      "Incident report"
    ];
  }

  createReportExport(input: ReportExportInput, principal: Principal) {
    const auditEvent = this.recordAudit({
      tenantId: principal.tenantId,
      userId: principal.userId,
      eventType: "report.export_requested",
      siteId: input.siteId,
      entityType: "report_export",
      afterMetadata: { reportType: input.reportType, parameters: input.parameters ?? {} },
      reason: "Report export placeholder requested."
    });

    const exportRecord = {
      ...input,
      id: randomUUID(),
      status: "queued_placeholder",
      requestedBy: principal.userId,
      createdAtUtc: auditEvent.createdAtUtc
    };
    this.reportExports.unshift(exportRecord);
    return exportRecord;
  }

  listAudit(principal: Principal, siteId?: string): AuditEvent[] {
    return this.scope(this.auditEvents, principal.tenantId).filter((event) => !siteId || event.siteId === siteId);
  }

  recordEdgeSync(input: EdgeSyncInput, principal: Principal) {
    this.requireSite(input.siteId, principal.tenantId);
    const batch = {
      ...input,
      id: randomUUID(),
      tenantId: principal.tenantId,
      createdAtUtc: nowIso()
    };
    this.edgeSyncBatches.unshift(batch);
    return batch;
  }

  health() {
    return {
      service: "greecon-api",
      status: "OK",
      timeUtc: nowIso(),
      modules: [
        "auth",
        "tenants",
        "users",
        "sites",
        "assets",
        "devices",
        "points",
        "telemetry",
        "derived-states",
        "rules",
        "commands",
        "alerts",
        "incidents",
        "maintenance",
        "reports",
        "audit",
        "edge-sync",
        "health"
      ]
    };
  }

  private scope<T extends { tenantId: string }>(records: T[], tenantId: string): T[] {
    return records.filter((record) => record.tenantId === tenantId);
  }

  private requireTenant(tenantId: string): Tenant {
    const tenant = this.tenants.find((candidate) => candidate.id === tenantId);
    if (!tenant) throw new ForbiddenException("Tenant is not available in this context.");
    return tenant;
  }

  private requireSite(siteId: string, tenantId: string): Site {
    const site = this.sites.find((candidate) => candidate.id === siteId);
    if (!site) throw new NotFoundException("Site not found.");
    if (site.tenantId !== tenantId) throw new ForbiddenException("Site is outside tenant scope.");
    return site;
  }

  private requireDevice(deviceId: string, tenantId: string): Device {
    const device = this.devices.find((candidate) => candidate.id === deviceId);
    if (!device) throw new NotFoundException("Device not found.");
    if (device.tenantId !== tenantId) throw new ForbiddenException("Device is outside tenant scope.");
    return device;
  }

  private requirePoint(pointId: string, tenantId: string): Point {
    const point = this.points.find((candidate) => candidate.id === pointId);
    if (!point) throw new NotFoundException("Point not found.");
    if (point.tenantId !== tenantId) throw new ForbiddenException("Point is outside tenant scope.");
    return point;
  }

  private latestReadings(readings: TelemetryReading[]): TelemetryReading[] {
    const latest = new Map<string, TelemetryReading>();
    for (const item of readings) {
      const existing = latest.get(item.pointId);
      if (!existing || Date.parse(item.timestampUtc) > Date.parse(existing.timestampUtc)) {
        latest.set(item.pointId, item);
      }
    }
    return [...latest.values()].sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
  }

  private latestNumber(canonicalName: string): number | undefined {
    const readingValue = this.latestReadings(this.telemetry).find((item) => item.canonicalName === canonicalName);
    return typeof readingValue?.value === "number" ? readingValue.value : undefined;
  }

  private stateValue(stateKey: string): boolean {
    return this.derivedStates.some((stateValue) => stateValue.stateKey === stateKey && stateValue.stateValue === true);
  }

  private sensorSnapshot(tenantId: string, siteId?: string): SensorSnapshot {
    const snapshot: SensorSnapshot = {};
    const readings = this.latestReadings(this.telemetry.filter((item) => item.tenantId === tenantId && (!siteId || item.siteId === siteId)));
    for (const item of readings) {
      snapshot[item.canonicalName] = {
        value: item.value,
        unit: item.unit,
        quality: item.quality,
        timestampUtc: item.timestampUtc
      };
    }
    return snapshot;
  }

  private stateSnapshot(tenantId: string, siteId?: string): StateSnapshot {
    const snapshot: StateSnapshot = {};
    for (const item of this.derivedStates.filter((stateValue) => stateValue.tenantId === tenantId && (!siteId || stateValue.siteId === siteId))) {
      snapshot[item.stateKey] = item;
    }
    return snapshot;
  }

  private refreshDerivedStates(tenantId: string, siteId: string): void {
    const sensors = this.sensorSnapshot(tenantId, siteId);
    const generated = deriveOperationalStates(sensors);
    this.derivedStates = this.derivedStates.filter((stateValue) => stateValue.tenantId !== tenantId || stateValue.siteId !== siteId || !generated.some((item) => item.stateKey === stateValue.stateKey));
    for (const item of generated) {
      this.derivedStates.push({
        id: randomUUID(),
        tenantId,
        siteId,
        stateKey: item.stateKey,
        stateValue: item.stateValue,
        severity: item.severity,
        confidence: item.confidence,
        reason: item.reason,
        createdAtUtc: nowIso(),
        updatedAtUtc: nowIso()
      });
    }
  }

  private recordAudit(event: Omit<AuditEvent, "id" | "createdAtUtc">): AuditEvent {
    const auditEvent: AuditEvent = {
      ...event,
      id: randomUUID(),
      createdAtUtc: nowIso()
    };
    this.auditEvents.unshift(auditEvent);
    return auditEvent;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function addMinutesIso(minutes: number): string {
  return new Date(Date.now() + minutes * 60000).toISOString();
}

function addDaysIso(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString();
}

function reading(
  siteId: string,
  assetId: string,
  deviceId: string,
  pointId: string,
  canonicalName: TelemetryReading["canonicalName"],
  value: number,
  unit: string,
  quality: TelemetryReading["quality"],
  minutesAgo: number
): TelemetryReading {
  return {
    timestampUtc: new Date(Date.now() - minutesAgo * 60000).toISOString(),
    tenantId: DEMO_TENANT_ID,
    siteId,
    assetId,
    deviceId,
    pointId,
    canonicalName,
    value,
    unit,
    quality,
    source: "simulator",
    ingestionTimestampUtc: nowIso()
  };
}

function state(
  stateKey: DerivedState["stateKey"],
  stateValue: boolean,
  severity: DerivedState["severity"],
  siteId: string,
  assetId: string,
  reason: string
): DerivedState {
  return {
    id: randomUUID(),
    tenantId: DEMO_TENANT_ID,
    siteId,
    assetId,
    stateKey,
    stateValue,
    severity,
    confidence: 0.9,
    reason,
    createdAtUtc: nowIso(),
    updatedAtUtc: nowIso()
  };
}

function audit(
  eventType: string,
  entityType: string,
  entityId: string,
  reason: string,
  siteId?: string,
  assetId?: string
): AuditEvent {
  return {
    id: randomUUID(),
    tenantId: DEMO_TENANT_ID,
    userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    eventType,
    siteId,
    assetId,
    entityType,
    entityId,
    afterMetadata: { seeded: true },
    reason,
    createdAtUtc: nowIso()
  };
}

function demoRules(): AutomationRule[] {
  return [
    {
      id: "88888888-8888-4888-8888-888888888801",
      tenantId: DEMO_TENANT_ID,
      siteId: "22222222-2222-4222-8222-222222222202",
      name: "Dry-run protection",
      priority: "safety",
      triggerType: "failsafe",
      conditions: [{ point: "water.flow.lpm", operator: "lte", value: 0.2 }],
      constraints: [],
      actions: [{ type: "command", targetCanonicalName: "water.pump.command", value: "OFF", message: "Stop pump because flow is below dry-run threshold." }],
      executionMode: "edge",
      explanationTemplate: "Pump protection is applied locally at the edge.",
      rollbackBehavior: "Keep pump stopped until flow and sensor quality are valid.",
      enabled: true,
      approvalState: "approved",
      version: 1,
      createdBy: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      updatedBy: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"
    },
    {
      id: "88888888-8888-4888-8888-888888888802",
      tenantId: DEMO_TENANT_ID,
      siteId: "22222222-2222-4222-8222-222222222202",
      name: "Overpressure cutoff",
      priority: "safety",
      triggerType: "threshold",
      conditions: [{ point: "water.pressure.bar", operator: "gte", value: 5.5 }],
      constraints: [],
      actions: [{ type: "command", targetCanonicalName: "water.pump.command", value: "OFF", message: "Stop pump because pressure exceeds safety limit." }],
      executionMode: "edge",
      explanationTemplate: "Overpressure cutoff is enforced locally and cannot be bypassed remotely.",
      rollbackBehavior: "Stop pump and require inspection before restart.",
      enabled: true,
      approvalState: "approved",
      version: 1,
      createdBy: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      updatedBy: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"
    },
    {
      id: "88888888-8888-4888-8888-888888888803",
      tenantId: DEMO_TENANT_ID,
      siteId: "22222222-2222-4222-8222-222222222201",
      name: "Irrigate when soil moisture is low",
      priority: "optimization",
      triggerType: "threshold",
      conditions: [{ stateKey: "agri.irrigation_required", operator: "eq", value: true }],
      constraints: [{ stateKey: "system.sensor_quality_bad", operator: "neq", value: true }],
      actions: [{ type: "command", targetCanonicalName: "agri.irrigation.command", value: "ON", message: "Start irrigation when soil moisture remains below threshold." }],
      executionMode: "simulation",
      explanationTemplate: "Irrigation starts only when sensor quality and safety constraints are satisfied.",
      rollbackBehavior: "Stop irrigation and return to previous schedule.",
      enabled: true,
      approvalState: "approved",
      version: 1,
      createdBy: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      updatedBy: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"
    },
    {
      id: "88888888-8888-4888-8888-888888888804",
      tenantId: DEMO_TENANT_ID,
      siteId: "22222222-2222-4222-8222-222222222202",
      name: "Refill tank when solar surplus exists",
      priority: "efficiency",
      triggerType: "multi_variable",
      conditions: [
        { stateKey: "water.tank.low", operator: "eq", value: true },
        { stateKey: "energy.surplus_available", operator: "eq", value: true }
      ],
      constraints: [{ stateKey: "system.sensor_quality_bad", operator: "neq", value: true }],
      actions: [{ type: "command", targetCanonicalName: "water.pump.command", value: "ON", message: "Refill water tank during solar surplus window." }],
      executionMode: "simulation",
      explanationTemplate: "Tank refill is aligned with available renewable energy.",
      rollbackBehavior: "Stop pump and return to minimum safe state.",
      enabled: true,
      approvalState: "approved",
      version: 1,
      createdBy: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      updatedBy: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"
    },
    {
      id: "88888888-8888-4888-8888-888888888805",
      tenantId: DEMO_TENANT_ID,
      siteId: "22222222-2222-4222-8222-222222222201",
      name: "Advisory: reduce irrigation if rain forecast placeholder is true",
      priority: "advisory",
      triggerType: "forecast",
      conditions: [{ stateKey: "agri.irrigation_required", operator: "eq", value: true }],
      constraints: [],
      actions: [{ type: "recommendation", message: "Check rain forecast placeholder before irrigation." }],
      executionMode: "advisory",
      explanationTemplate: "Forecast integration is planned; the MVP only records the recommendation.",
      rollbackBehavior: "No actuation is dispatched.",
      enabled: true,
      approvalState: "approved",
      version: 1,
      createdBy: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      updatedBy: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"
    }
  ];
}
