import { DataTable } from "../../../components/DataTable";
import { MetricGrid } from "../../../components/MetricGrid";
import { Section } from "../../../components/Section";
import { Shell } from "../../../components/Shell";
import { StatusBadge } from "../../../components/StatusBadge";
import { apiGet } from "../../../lib/api";
import { Metric } from "../../../lib/types";

interface SiteDetail {
  site: { id: string; name: string; type: string; locationName: string; status: string; edgeStatus: string };
  assets: Array<{ id: string; name: string; type: string; status: string }>;
  latestTelemetry: Array<{ pointId: string; canonicalName: string; value: number | boolean | string; unit: string; quality: string }>;
  rules: Array<{ id: string; name: string; priority: string; executionMode: string; approvalState: string }>;
  alerts: Array<{ id: string; severity: string; title: string; status: string }>;
}

export async function generateStaticParams() {
  // Only the static-export build (docs/12-deployment-github-pages.md) needs every route
  // pre-rendered up front — a normal SSR build (Railway, GCP) renders these on request and
  // has no live API to query yet at build time, so skip the fetch entirely there.
  if (process.env.NEXT_OUTPUT_EXPORT !== "1") return [];

  const sites = await apiGet<Array<{ id: string }>>("/sites");
  return sites.map((site) => ({ siteId: site.id }));
}

export default async function SiteDetailPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const detail = await apiGet<SiteDetail>(`/sites/${siteId}`);
  const { site } = detail;
  const metrics = buildMetrics(detail);

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
        <DataTable
          rows={detail.assets}
          columns={[
            { key: "name", label: "Asset" },
            { key: "type", label: "Type" },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> }
          ]}
        />
      </Section>
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
