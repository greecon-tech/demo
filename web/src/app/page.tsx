import Link from "next/link";
import { DataTable } from "../components/DataTable";
import { MetricGrid } from "../components/MetricGrid";
import { Section } from "../components/Section";
import { Shell } from "../components/Shell";
import { StatusBadge } from "../components/StatusBadge";
import { alerts, overviewMetrics, sites, tenant } from "../lib/demo-data";

export default function OverviewPage() {
  return (
    <Shell title="Platform Overview" subtitle="Integrated energy, water, agriculture, automation, and edge status.">
      <MetricGrid metrics={overviewMetrics} />
      <div className="split">
        <Section title="Sites">
          <div className="site-list">
            {sites.map((site) => (
              <Link href={`/sites/${site.id}`} className="site-row" key={site.id}>
                <div>
                  <strong>{site.name}</strong>
                  <p className="muted">{site.location}</p>
                </div>
                <span>{site.type}</span>
                <StatusBadge status={site.status} />
                <StatusBadge status={site.edge} />
              </Link>
            ))}
          </div>
        </Section>
        <Section title="Active Alerts">
          <DataTable
            rows={alerts.filter((alert) => alert.status === "Open")}
            columns={[
              { key: "severity", label: "Severity" },
              { key: "title", label: "Alert" },
              { key: "site", label: "Site" }
            ]}
          />
        </Section>
      </div>
      <Section title="Operating Identity">
        <div className="panel">
          <p>
            {tenant.company} is building a long-term operational platform for sustainable resource systems from {tenant.location}.
          </p>
        </div>
      </Section>
    </Shell>
  );
}
