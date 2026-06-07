export type Status = "OK" | "Watch" | "Warning" | "Critical" | "Offline" | "Simulated" | "Manual Override";

export interface SiteSummary {
  id: string;
  name: string;
  type: string;
  location: string;
  status: Status;
  edge: Status;
  energyKw: number;
  waterLevel: number;
  soilMoisture: number;
}

export interface Metric {
  label: string;
  value: string;
  unit?: string;
  status: Status;
  note: string;
}

export const tenant = {
  name: "Greecon Demo",
  company: "Greecon Sh.p.k",
  domain: "greecon.earth",
  founder: "Eridon Manuka",
  location: "Durana Tech Park, Albania",
  status: "Pre-seed"
};

export const sites: SiteSummary[] = [
  {
    id: "22222222-2222-4222-8222-222222222201",
    name: "Integrated Farm Site",
    type: "Integrated site",
    location: "Durana Tech Park, Albania",
    status: "OK",
    edge: "OK",
    energyKw: 18.6,
    waterLevel: 61,
    soilMoisture: 24
  },
  {
    id: "22222222-2222-4222-8222-222222222202",
    name: "Water Management Site",
    type: "Water facility",
    location: "Albania",
    status: "Watch",
    edge: "OK",
    energyKw: 4.1,
    waterLevel: 38,
    soilMoisture: 0
  },
  {
    id: "22222222-2222-4222-8222-222222222203",
    name: "Solar + Battery Site",
    type: "Energy site",
    location: "Albania",
    status: "OK",
    edge: "Simulated",
    energyKw: 22.4,
    waterLevel: 0,
    soilMoisture: 0
  }
];

export const overviewMetrics: Metric[] = [
  { label: "Solar production", value: "18.6", unit: "kW", status: "OK", note: "Renewable generation available" },
  { label: "Battery state", value: "68", unit: "%", status: "OK", note: "Battery not constrained" },
  { label: "Tank level", value: "38", unit: "%", status: "Watch", note: "Refill planning threshold active" },
  { label: "Line pressure", value: "2.8", unit: "bar", status: "OK", note: "Within operating range" },
  { label: "Soil moisture", value: "24", unit: "%", status: "Watch", note: "Irrigation rule simulated" },
  { label: "Edge connectivity", value: "2 / 3", unit: "sites", status: "Watch", note: "One site is simulated" }
];

export const energyMetrics: Metric[] = [
  { label: "Solar production", value: "18.6", unit: "kW", status: "OK", note: "Current site generation" },
  { label: "Consumption", value: "14.2", unit: "kW", status: "OK", note: "Current load estimate" },
  { label: "Battery SOC", value: "68", unit: "%", status: "OK", note: "Storage available" },
  { label: "Grid import", value: "0.0", unit: "kW", status: "OK", note: "Placeholder until meter driver exists" },
  { label: "Grid export", value: "2.1", unit: "kW", status: "Watch", note: "Export estimate in simulation" },
  { label: "Surplus state", value: "Available", status: "OK", note: "Optimization can schedule flexible load" }
];

export const waterMetrics: Metric[] = [
  { label: "Tank level", value: "38", unit: "%", status: "Watch", note: "Below planning threshold" },
  { label: "Flow", value: "11.7", unit: "lpm", status: "OK", note: "Dry-run condition not active" },
  { label: "Pressure", value: "2.8", unit: "bar", status: "OK", note: "Overpressure cutoff clear" },
  { label: "Pump status", value: "Ready", status: "OK", note: "Commands simulated by default" },
  { label: "Leak state", value: "Clear", status: "OK", note: "No leak signal in demo data" },
  { label: "Recycling unit", value: "Planned", status: "Simulated", note: "Wastewater module placeholder" }
];

export const agricultureMetrics: Metric[] = [
  { label: "Soil moisture", value: "24", unit: "%", status: "Watch", note: "Irrigation required state active" },
  { label: "Temperature", value: "24.5", unit: "C", status: "OK", note: "Greenhouse climate stable" },
  { label: "Humidity", value: "62", unit: "%", status: "OK", note: "Within operating range" },
  { label: "Irrigation", value: "Simulated", status: "Simulated", note: "Rule runs in shadow mode" },
  { label: "Fertigation", value: "Planned", status: "Simulated", note: "Point schema reserved" },
  { label: "Recommendation", value: "Review", status: "Watch", note: "Forecast placeholder affects irrigation" }
];

export const assets = [
  { name: "Solar Array A", type: "SolarSystem", site: "Integrated Farm Site", status: "OK" },
  { name: "Battery Bank A", type: "BatterySystem", site: "Solar + Battery Site", status: "OK" },
  { name: "Primary Water Tank", type: "WaterSystem", site: "Water Management Site", status: "Watch" },
  { name: "Pump Station North", type: "PumpStation", site: "Water Management Site", status: "OK" },
  { name: "Irrigation Zone 1", type: "IrrigationZone", site: "Integrated Farm Site", status: "OK" },
  { name: "Greenhouse Block A", type: "Greenhouse", site: "Integrated Farm Site", status: "OK" },
  { name: "Weather Station", type: "WeatherStation", site: "Integrated Farm Site", status: "OK" }
] as const;

export const devices = [
  { name: "Solar Inverter A", protocol: "simulated", point: "energy.solar.power.kw", health: "OK", quality: "OK", lastSeen: "Now", asset: "Solar Array A" },
  { name: "Battery Controller A", protocol: "simulated", point: "energy.battery.soc.percent", health: "OK", quality: "OK", lastSeen: "Now", asset: "Battery Bank A" },
  { name: "Tank Level Sensor", protocol: "simulated", point: "water.tank.level.percent", health: "OK", quality: "WARN", lastSeen: "Now", asset: "Primary Water Tank" },
  { name: "Pump Station PLC", protocol: "simulated", point: "water.flow.lpm / water.pressure.bar", health: "OK", quality: "OK", lastSeen: "Now", asset: "Pump Station North" },
  { name: "Irrigation Controller", protocol: "simulated", point: "agri.soil.moisture.percent", health: "OK", quality: "OK", lastSeen: "Now", asset: "Irrigation Zone 1" },
  { name: "Weather Station Node", protocol: "simulated", point: "agri.air.temperature.c / agri.humidity.percent", health: "OK", quality: "OK", lastSeen: "Now", asset: "Weather Station" }
] as const;

export const rules = [
  { name: "Dry-run protection", priority: "Safety", mode: "Edge", state: "Approved", result: "Ready", explanation: "Stops pump if flow remains below dry-run threshold." },
  { name: "Overpressure cutoff", priority: "Safety", mode: "Edge", state: "Approved", result: "Ready", explanation: "Stops pump when pressure exceeds the configured limit." },
  { name: "Irrigate when soil moisture is low", priority: "Optimization", mode: "Simulation", state: "Approved", result: "Rule simulated", explanation: "Soil moisture is low; action remains simulated until approved for actuation." },
  { name: "Refill tank when solar surplus exists", priority: "Efficiency", mode: "Simulation", state: "Approved", result: "Rule simulated", explanation: "Tank refill aligns with renewable surplus when safety conditions are valid." },
  { name: "Advisory: reduce irrigation if rain forecast placeholder is true", priority: "Advisory", mode: "Advisory", state: "Approved", result: "Recommendation", explanation: "Forecast integration is not active in MVP; recommendation only." }
] as const;

export const automationHistory = [
  { time: "10:12 UTC", rule: "Irrigate when soil moisture is low", action: "Simulated irrigation start", safety: "Passed", result: "No actuation" },
  { time: "09:48 UTC", rule: "Refill tank when solar surplus exists", action: "Simulated pump start", safety: "Passed", result: "No actuation" },
  { time: "09:02 UTC", rule: "Dry-run protection", action: "Safety evaluation", safety: "Passed", result: "No block" }
] as const;

export const alerts = [
  { severity: "Warning", site: "Water Management Site", asset: "Primary Water Tank", title: "Water tank approaching low threshold", status: "Open", action: "Review refill timing" },
  { severity: "Watch", site: "Integrated Farm Site", asset: "Irrigation Zone 1", title: "Soil moisture below irrigation threshold", status: "Open", action: "Simulate irrigation rule" },
  { severity: "Watch", site: "Solar + Battery Site", asset: "Gateway", title: "Edge site running in simulation", status: "Acknowledged", action: "Provision gateway identity" }
] as const;

export const incidents = [
  { title: "Water storage planning review", site: "Water Management Site", status: "Acknowledged", severity: "Warning", maintenance: "Inspect pump station pressure sensor" }
] as const;

export const auditEvents = [
  { time: "2026-04-29 10:12 UTC", user: "Demo Operator", event: "command.simulated_dispatch", site: "Integrated Farm Site", entity: "irrigation command", reason: "Rule simulated" },
  { time: "2026-04-29 09:48 UTC", user: "Demo Operator", event: "command.simulated_dispatch", site: "Water Management Site", entity: "pump command", reason: "Solar surplus refill simulation" },
  { time: "2026-04-29 09:02 UTC", user: "Eridon Manuka", event: "rule.approved", site: "Water Management Site", entity: "Dry-run protection", reason: "Initial safety baseline" },
  { time: "2026-04-29 08:55 UTC", user: "Demo Operator", event: "alert.acknowledged", site: "Water Management Site", entity: "Low tank alert", reason: "Operator acknowledged" }
] as const;

export const reportTypes = [
  { name: "Operational report", scope: "Sites, equipment health, active incidents", status: "Ready" },
  { name: "Sustainability report", scope: "Energy, water, efficiency, resource use", status: "Ready" },
  { name: "Audit report", scope: "Access, rules, commands, overrides", status: "Ready" },
  { name: "Incident report", scope: "Alerts, lifecycle, maintenance links", status: "Ready" }
] as const;

export function siteById(siteId: string): SiteSummary {
  return sites.find((site) => site.id === siteId) ?? sites[0]!;
}
