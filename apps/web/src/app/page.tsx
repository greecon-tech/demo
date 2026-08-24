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
    energy: { solarPowerKw?: number; batterySocPercent?: number; surplusState: string };
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
    <Shell title="Platform Overview" subtitle="Integrated energy, water, agriculture, automation, and edge status.">
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

function buildMetrics(overview: Overview): Metric[] {
  const { energy, water, agriculture, edge } = overview.summaries;
  return [
    { label: "Solar production", value: formatNumber(energy.solarPowerKw), unit: "kW", status: "OK", note: "Renewable generation available" },
    { label: "Battery state", value: formatNumber(energy.batterySocPercent), unit: "%", status: "OK", note: `Surplus ${energy.surplusState.toLowerCase()}` },
    { label: "Tank level", value: formatNumber(water.tankLevelPercent), unit: "%", status: water.tankLevelPercent !== undefined && water.tankLevelPercent < 35 ? "Watch" : "OK", note: "Refill planning threshold" },
    { label: "Line pressure", value: formatNumber(water.pressureBar), unit: "bar", status: "OK", note: "Within operating range" },
    { label: "Soil moisture", value: formatNumber(agriculture.soilMoisturePercent), unit: "%", status: agriculture.soilMoisturePercent !== undefined && agriculture.soilMoisturePercent < 28 ? "Watch" : "OK", note: "Irrigation rule simulated" },
    { label: "Edge connectivity", value: `${edge.connectedSites} / ${edge.connectedSites + edge.simulatedSites}`, unit: "sites", status: edge.simulatedSites > 0 ? "Watch" : "OK", note: edge.simulatedSites > 0 ? "One or more sites are simulated" : "All sites connected" }
  ];
}

function formatNumber(value: number | undefined): string {
  return value === undefined ? "—" : value.toFixed(1);
}
