import { DataTable } from "../../components/DataTable";
import { Section } from "../../components/Section";
import { Shell } from "../../components/Shell";
import { StatusBadge } from "../../components/StatusBadge";
import { apiGet } from "../../lib/api";

interface Alert {
  id: string;
  severity: string;
  title: string;
  status: string;
  suggestedAction: string;
}

interface Incident {
  id: string;
  title: string;
  status: string;
  severity: string;
  investigationNotes?: string;
}

export default async function AlertsPage() {
  // Pinned to "operator" — incident data requires incident:manage, which viewer and auditor
  // builds don't hold (see docs/12-deployment-github-pages.md), so this can't follow the
  // page's default demo role the way most other fetches do.
  const [alerts, incidents] = await Promise.all([apiGet<Alert[]>("/alerts"), apiGet<Incident[]>("/incidents", "operator")]);

  return (
    <Shell title="Alerts" subtitle="Active alerts, suggested actions, and incident lifecycle.">
      <Section title="Active Alerts">
        <DataTable
          rows={alerts}
          columns={[
            { key: "severity", label: "Severity", render: (row) => <StatusBadge status={row.severity} /> },
            { key: "title", label: "Alert" },
            { key: "status", label: "Status" },
            { key: "suggestedAction", label: "Suggested Action" }
          ]}
        />
      </Section>
      <Section title="Incidents">
        <DataTable
          rows={incidents}
          columns={[
            { key: "title", label: "Incident" },
            { key: "severity", label: "Severity", render: (row) => <StatusBadge status={row.severity} /> },
            { key: "status", label: "Status" },
            { key: "investigationNotes", label: "Notes" }
          ]}
        />
      </Section>
    </Shell>
  );
}
