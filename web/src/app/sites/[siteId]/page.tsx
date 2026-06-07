import { MetricGrid } from "../../../components/MetricGrid";
import { Section } from "../../../components/Section";
import { Shell } from "../../../components/Shell";
import { StatusBadge } from "../../../components/StatusBadge";
import { agricultureMetrics, assets, energyMetrics, rules, siteById, waterMetrics } from "../../../lib/demo-data";
import { DataTable } from "../../../components/DataTable";

export default async function SiteDetailPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const site = siteById(siteId);

  return (
    <Shell title={site.name} subtitle={`${site.type} · ${site.location}`}>
      <div className="tabs">
        {["Summary", "Energy", "Water", "Agriculture", "Equipment", "Automation", "Alerts", "Reports", "Audit"].map((tab) => (
          <span key={tab}>{tab}</span>
        ))}
      </div>
      <Section title="Summary" aside={<StatusBadge status={site.status} />}>
        <MetricGrid metrics={[energyMetrics[0]!, waterMetrics[0]!, agricultureMetrics[0]!, { label: "Edge connectivity", value: site.edge, status: site.edge, note: "Gateway health state" }]} />
      </Section>
      <Section title="Equipment">
        <DataTable
          rows={assets.filter((asset) => asset.site === site.name || site.name === "Integrated Farm Site")}
          columns={[
            { key: "name", label: "Asset" },
            { key: "type", label: "Type" },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status)} /> }
          ]}
        />
      </Section>
      <Section title="Automation">
        <DataTable
          rows={rules}
          columns={[
            { key: "name", label: "Rule" },
            { key: "priority", label: "Priority" },
            { key: "mode", label: "Mode" },
            { key: "result", label: "State" }
          ]}
        />
      </Section>
    </Shell>
  );
}
