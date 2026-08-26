import { hasPermission } from "@greecon/shared";
import { DataTable } from "../../../components/DataTable";
import { MetricGrid } from "../../../components/MetricGrid";
import { Section } from "../../../components/Section";
import { SensorMap } from "../../../components/SensorMap";
import { Shell } from "../../../components/Shell";
import { StatusBadge } from "../../../components/StatusBadge";
import { apiGet, DEMO_ROLE } from "../../../lib/api";
import { Metric } from "../../../lib/types";

interface SiteDetail {
  site: { id: string; name: string; type: string; locationName: string; status: string; edgeStatus: string };
  assets: Array<{ id: string; name: string; type: string; status: string }>;
  devices: Array<{ id: string; name: string; deviceType: string; protocol: string; health: string; lastSeenUtc?: string; positionX?: number; positionY?: number; placementNote?: string }>;
  points: Array<{ id: string; deviceId: string; label: string; unit: string; canonicalName: string; capability: string }>;
  latestTelemetry: Array<{ pointId: string; canonicalName: string; value: number | boolean | string; unit: string; quality: string }>;
  rules: Array<{ id: string; name: string; priority: string; executionMode: string; approvalState: string }>;
  alerts: Array<{ id: string; severity: string; title: string; status: string }>;
}

// Static-export twin of page.tsx (see apps/web/scripts/build-static.sh). Only this build needs
// every site pre-rendered up front, since a static export has no live API to query at request
// time; the real SSR page renders on request and deliberately has no generateStaticParams (see
// its own comment for why that combination broke it).
export async function generateStaticParams() {
  const sites = await apiGet<Array<{ id: string }>>("/sites");
  return sites.map((site) => ({ siteId: site.id }));
}

export default async function SiteDetailPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const detail = await apiGet<SiteDetail>(`/sites/${siteId}`);
  const { site } = detail;
  const metrics = buildMetrics(detail);
  const canControl = hasPermission(DEMO_ROLE, "command:create");
  const hasControllableEquipment = detail.points.some((point) => point.capability === "write" || point.capability === "read_write");

  return (
    <Shell title={site.name} subtitle={`${site.type} · ${site.locationName}`}>
      <div className="tabs">
        {["Summary", "Equipment", "Automation", "Alerts"].map((tab) => (
          <span key={tab}>{tab}</span>
        ))}
      </div>
      <Section title="Summary" aside={<StatusBadge status={site.status} />}>
        <MetricGrid metrics={metrics} />
      </Section>
      <Section title="Equipment">
        <SensorMap devices={detail.devices} points={detail.points} readings={detail.latestTelemetry} />
      </Section>
      {canControl && hasControllableEquipment ? (
        <Section title="Manual Control" aside={<span className="muted">Automatic (rules/AI) is the default mode</span>}>
          <div className="panel">
            <p className="muted">
              Manual control requires a live deployment (Railway or Google Cloud) — this build is a static snapshot with no server to dispatch commands to. See docs/12-deployment-github-pages.md.
            </p>
          </div>
        </Section>
      ) : null}
      <Section title="Automation">
        <DataTable
          rows={detail.rules}
          columns={[
            { key: "name", label: "Rule" },
            { key: "priority", label: "Priority" },
            { key: "executionMode", label: "Mode" },
            { key: "approvalState", label: "State" }
          ]}
        />
      </Section>
      <Section title="Alerts">
        <DataTable
          rows={detail.alerts}
          columns={[
            { key: "severity", label: "Severity", render: (row) => <StatusBadge status={row.severity} /> },
            { key: "title", label: "Alert" },
            { key: "status", label: "Status" }
          ]}
        />
      </Section>
    </Shell>
  );
}

function buildMetrics(detail: SiteDetail): Metric[] {
  return detail.latestTelemetry.map((reading) => ({
    label: reading.canonicalName,
    value: typeof reading.value === "number" ? reading.value.toFixed(1) : String(reading.value),
    unit: reading.unit,
    status: reading.quality === "OK" ? "OK" : reading.quality === "WARN" ? "Watch" : "Critical",
    note: `Quality: ${reading.quality}`
  }));
}
