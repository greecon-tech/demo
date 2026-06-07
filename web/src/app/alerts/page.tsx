import { DataTable } from "../../components/DataTable";
import { Section } from "../../components/Section";
import { Shell } from "../../components/Shell";
import { StatusBadge } from "../../components/StatusBadge";
import { alerts, incidents } from "../../lib/demo-data";

export default function AlertsPage() {
  return (
    <Shell title="Alerts" subtitle="Active alerts, suggested actions, and incident lifecycle.">
      <Section title="Active Alerts">
        <DataTable
          rows={alerts}
          columns={[
            { key: "severity", label: "Severity", render: (row) => <StatusBadge status={String(row.severity)} /> },
            { key: "site", label: "Site" },
            { key: "asset", label: "Asset" },
            { key: "title", label: "Alert" },
            { key: "status", label: "Status" },
            { key: "action", label: "Suggested Action" }
          ]}
        />
      </Section>
      <Section title="Incidents">
        <DataTable
          rows={incidents}
          columns={[
            { key: "title", label: "Incident" },
            { key: "site", label: "Site" },
            { key: "severity", label: "Severity" },
            { key: "status", label: "Status" },
            { key: "maintenance", label: "Maintenance" }
          ]}
        />
      </Section>
    </Shell>
  );
}
