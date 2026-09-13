import Link from "next/link";
import { DashboardWidgetPreference, GREECON_COMPANY, hasPermission } from "@greecon/shared";
import { DataTable } from "../components/DataTable";
import { MetricGrid } from "../components/MetricGrid";
import { Section } from "../components/Section";
import { Shell } from "../components/Shell";
import { StatusBadge } from "../components/StatusBadge";
import { apiGet, DEMO_ROLE } from "../lib/api";
import { applyDashboardPreferences } from "../lib/dashboard-preferences";
import { getSession } from "../lib/session";
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
  const [overview, preferences] = await Promise.all([
    apiGet<Overview>("/overview"),
    apiGet<DashboardWidgetPreference[]>("/dashboard-preferences")
  ]);
  const metrics = applyDashboardPreferences(buildMetrics(overview), preferences);
  const siteName = new Map(overview.sites.map((site) => [site.id, site.name]));
  const hasSites = overview.sites.length > 0;
  // A brand new tenant (every real client on day one, and Eridon's own real tenant right now)
  // starts with zero sites — metrics/alerts would otherwise render as a wall of meaningless empty
  // cards ("—" for a tank level that doesn't exist yet). Show onboarding guidance instead.
  const session = await getSession();
  const role = session?.user.role ?? DEMO_ROLE;
  const canManageSites = hasPermission(role, "site:manage");

  return (
    <Shell title="Overview" subtitle="Integrated energy, water, agriculture, automation, and edge status.">
      {hasSites ? (
        <>
          <div className="overview-toolbar">
            <Link href="/settings#dashboard" className="button-ghost">
              Customize dashboard
            </Link>
          </div>
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
        </>
      ) : (
        <Section title="Getting started">
          <ol className="getting-started">
            <li>
              <strong>Create your first site.</strong>
              <p className="muted">A site is one physical location — a farm, a pump station, a building — that holds its own devices and readings.</p>
              {canManageSites ? (
                <Link href="/admin" className="button-ghost">
                  Go to Admin → Create site
                </Link>
              ) : (
                <p className="muted">Ask a Greecon admin to create your first site.</p>
              )}
            </li>
            <li>
              <strong>Add its devices and reading points.</strong>
              <p className="muted">Once a site exists, open it to add each sensor or controller and the specific measurements it reports — right from that site's own page.</p>
            </li>
            <li>
              <strong>Connect the real hardware.</strong>
              <p className="muted">
                See <code>docs/14-edge-hardware-deployment.md</code> for wiring an actual industrial PC to start sending real readings.
              </p>
            </li>
          </ol>
        </Section>
      )}
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

  // Same "only show what this tenant actually has" rule as the energy fields above — previously
  // these three were pushed unconditionally, so a brand new tenant with no water/agriculture
  // equipment at all saw a permanent "—" card for each, with no indication anything was missing
  // rather than simply not applicable yet.
  if (water.tankLevelPercent !== undefined) {
    metrics.push({ label: "Tank level", value: formatNumber(water.tankLevelPercent), unit: "%", status: water.tankLevelPercent < 35 ? "Watch" : "OK", note: "Refill planning threshold" });
  }
  if (water.pressureBar !== undefined) {
    metrics.push({ label: "Line pressure", value: formatNumber(water.pressureBar), unit: "bar", status: "OK", note: "Within operating range" });
  }
  if (agriculture.soilMoisturePercent !== undefined) {
    metrics.push({ label: "Soil moisture", value: formatNumber(agriculture.soilMoisturePercent), unit: "%", status: agriculture.soilMoisturePercent < 28 ? "Watch" : "OK", note: "Irrigation rule simulated" });
  }
  const totalSites = edge.connectedSites + edge.simulatedSites;
  if (totalSites > 0) {
    metrics.push({ label: "Edge connectivity", value: `${edge.connectedSites} / ${totalSites}`, unit: "sites", status: edge.simulatedSites > 0 ? "Watch" : "OK", note: edge.simulatedSites > 0 ? "One or more sites are simulated" : "All sites connected" });
  }

  return metrics;
}

function formatNumber(value: number | undefined): string {
  return value === undefined ? "—" : value.toFixed(1);
}
