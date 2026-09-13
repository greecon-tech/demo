import { DataTable } from "../../components/DataTable";
import { RequestExportForm } from "../../components/RequestExportForm";
import { Section } from "../../components/Section";
import { Shell } from "../../components/Shell";
import { requirePermission } from "../../lib/access";
import { apiGet, DEMO_ROLE } from "../../lib/api";
import { getSession } from "../../lib/session";

// Requesting an export now binds a real Server Action — see page.static.tsx for the read-only
// twin used by the GitHub Pages export, and build-static.sh for the swap mechanism.
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await getSession();
  const role = session?.user.role ?? DEMO_ROLE;
  requirePermission(role, "report:export");

  const templates = await apiGet<string[]>("/reports/templates");
  const rows = templates.map((name) => ({ name, status: "Ready" }));

  return (
    <Shell title="Reports" subtitle="Operational, sustainability, audit, and incident evidence.">
      <Section title="Generate Report">
        <RequestExportForm templates={templates} />
      </Section>
      <Section title="Available Reports">
        <DataTable rows={rows} columns={[{ key: "name", label: "Report" }, { key: "status", label: "Status" }]} />
      </Section>
    </Shell>
  );
}
