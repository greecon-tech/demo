import { hasPermission } from "@greecon/shared";
import { DataTable } from "../../components/DataTable";
import { Section } from "../../components/Section";
import { Shell } from "../../components/Shell";
import { StatusBadge } from "../../components/StatusBadge";
import { apiGet, DEMO_ROLE } from "../../lib/api";
import { getSession } from "../../lib/session";

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
  const session = await getSession();
  const role = session?.user.role ?? DEMO_ROLE;
  // Incident data requires incident:manage, which viewer and auditor don't hold. The static
  // export still pins this to "operator" so every per-role build renders it regardless
  // (docs/12-deployment-github-pages.md); a real session instead just doesn't get this section
  // when its own role lacks the permission — see automation/page.tsx for the same pattern.
  const canReadIncidents = session ? hasPermission(role, "incident:manage") : true;

  const [alerts, incidents] = await Promise.all([
    apiGet<Alert[]>("/alerts"),
    canReadIncidents ? apiGet<Incident[]>("/incidents", "operator") : Promise.resolve([])
  ]);

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
        {canReadIncidents ? (
          <DataTable
            rows={incidents}
            columns={[
              { key: "title", label: "Incident" },
              { key: "severity", label: "Severity", render: (row) => <StatusBadge status={row.severity} /> },
              { key: "status", label: "Status" },
              { key: "investigationNotes", label: "Notes" }
            ]}
          />
        ) : (
          <p className="muted">Your role does not have permission to view incidents.</p>
        )}
      </Section>
    </Shell>
  );
}
