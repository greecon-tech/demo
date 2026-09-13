import { IncidentStatus } from "@greecon/shared";
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
  status: IncidentStatus;
  severity: string;
  investigationNotes?: string;
}

// Static-export twin of page.tsx (see apps/web/scripts/build-static.sh). Acknowledging an alert
// and changing an incident's status both go through real Server Actions that call the live API —
// none of that exists here, since the static build has no server to send those mutations to.
export default async function AlertsPage() {
  // The static export has no real session, so every per-role build shows incidents regardless of
  // which role that build represents — matching the original combined page's `session ? ... :
  // true` fallback before this file split into a live/static twin pair.
  const canReadIncidents = true;

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
        <p className="muted">Acknowledging an alert requires a live deployment (Railway or Google Cloud). See docs/12-deployment-github-pages.md.</p>
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
