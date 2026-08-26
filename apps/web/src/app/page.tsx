import Link from "next/link";
import { GREECON_COMPANY } from "@greecon/shared";
import { DataTable } from "../components/DataTable";
import { MetricGrid } from "../components/MetricGrid";
import { Section } from "../components/Section";
import { Shell } from "../components/Shell";
import { StatusBadge } from "../components/StatusBadge";
import { apiGet } from "../lib/api";
import { Metric } from "../lib/types";

interface OverviewSite {
  id: string;
  name: string;
  locationName: string;
  type: string;
  status: string;
  edgeStatus: string;
}

interface OverviewAlert {
  id: string;
  severity: string;
  title: string;
  siteId: string;
}

interface Overview {
  status: string;
  sites: OverviewSite[];
  summaries: {
    energy: {
      solarPowerKw?: number;
      batterySocPercent?: number;
      batteryPowerKw?: number;
      consumptionKw?: number;
      gridImportKw?: number;
      gridExportKw?: number;
      surplusState: string;
    };
    water: { tankLevelPercent?: number; flowLpm?: number; pressureBar?: number };
    agriculture: { soilMoisturePercent?: number; temperatureC?: number; humidityPercent?: number };
    edge: { connectedSites: number; simulatedSites: number };
  };
  activeAlerts: OverviewAlert[];
}

export default async function OverviewPage() {
  const overview = await apiGet<Overview>("/overview");
  const metrics = buildMetrics(overview);
  const siteName = new Map(overview.sites.map((site) => [site.id, site.name]));

  return (
    <Shell title="Overview" subtitle="Integrated energy, water, agriculture, automation, and edge status.">
      <MetricGrid metrics={metrics} />
      <div className="split">
        <Section title="Sites">
          <div className="site-list">
            {overview.sites.map((site) => (
              <Link href={`/sites/${site.id}`} className="site-row" key={site.id}>
                <div>
                  <strong>{site.name}</strong>
                  <p className="muted">{site.locationName}</p>
                </div>
                <span>{site.type}</span>
                <StatusBadge status={site.status} />
                <StatusBadge status={site.edgeStatus} />
              </Link>
            ))}
          </div>
        </Section>
        <Section title="Active Alerts">
          <DataTable
            wide={false}
            rows={overview.activeAlerts.map((alert) => ({ ...alert, site: siteName.get(alert.siteId) ?? alert.siteId }))}
            columns={[
              { key: "severity", label: "Severity", render: (row) => <StatusBadge status={row.severity} /> },
              { key: "title", label: "Alert" },
              { key: "site", label: "Site" }
            ]}
          />
        </Section>
      </div>
      <Section title="Operating Identity">
        <div className="panel">
          <p>{GREECON_COMPANY} is building a long-term operational platform for sustainable resource systems from Durana Tech Park, Albania.</p>
        </div>
      </Section>
    </Shell>
  );
}

// Each energy metric is only added when the tenant's sites actually meter it — a fleet with no
// battery simply omits the battery card rather than showing a placeholder, and a fleet with no
// grid connection omits the grid cards. This is what makes the energy summary "customizable"
// per deployment instead of assuming every site has the same equipment.
function buildMetrics(overview: Overview): Metric[] {
  const { energy, water, agriculture, edge } = overview.summaries;
  const metrics: Metric[] = [];

  if (energy.solarPowerKw !== undefined) {
    metrics.push({ label: "Solar production", value: formatNumber(energy.solarPowerKw), unit: "kW", status: "OK", note: `Surplus ${energy.surplusState.toLowerCase()}` });
  }
  if (energy.batterySocPercent !== undefined) {
    metrics.push({ label: "Battery state", value: formatNumber(energy.batterySocPercent), unit: "%", status: energy.batterySocPercent < 25 ? "Watch" : "OK", note: "State of charge" });
  }
  if (energy.consumptionKw !== undefined) {
    metrics.push({ label: "Energy consumption", value: formatNumber(energy.consumptionKw), unit: "kW", status: "OK", note: "Site load, all sources" });
  }
  if (energy.gridImportKw !== undefined) {
    metrics.push({ label: "Grid import", value: formatNumber(energy.gridImportKw), unit: "kW", status: "OK", note: "Drawn from the grid" });
  }
  if (energy.gridExportKw !== undefined) {
    metrics.push({ label: "Grid export", value: formatNumber(energy.gridExportKw), unit: "kW", status: "OK", note: "Sent to the grid" });
  }

  metrics.push(
    { label: "Tank level", value: formatNumber(water.tankLevelPercent), unit: "%", status: water.tankLevelPercent !== undefined && water.tankLevelPercent < 35 ? "Watch" : "OK", note: "Refill planning threshold" },
    { label: "Line pressure", value: formatNumber(water.pressureBar), unit: "bar", status: "OK", note: "Within operating range" },
    { label: "Soil moisture", value: formatNumber(agriculture.soilMoisturePercent), unit: "%", status: agriculture.soilMoisturePercent !== undefined && agriculture.soilMoisturePercent < 28 ? "Watch" : "OK", note: "Irrigation rule simulated" },
    { label: "Edge connectivity", value: `${edge.connectedSites} / ${edge.connectedSites + edge.simulatedSites}`, unit: "sites", status: edge.simulatedSites > 0 ? "Watch" : "OK", note: edge.simulatedSites > 0 ? "One or more sites are simulated" : "All sites connected" }
  );

  return metrics;
}

function formatNumber(value: number | undefined): string {
  return value === undefined ? "—" : value.toFixed(1);
}
