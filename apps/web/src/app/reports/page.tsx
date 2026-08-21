import { DataTable } from "../../components/DataTable";
import { Section } from "../../components/Section";
import { Shell } from "../../components/Shell";
import { apiGet } from "../../lib/api";

export default async function ReportsPage() {
  const templates = await apiGet<string[]>("/reports/templates", "auditor");
  const rows = templates.map((name) => ({ name, status: "Ready" }));

  return (
    <Shell title="Reports" subtitle="Operational, sustainability, audit, and incident evidence.">
      <Section title="Generate Report">
        <div className="panel stack">
          <label>
            Report type
            <select defaultValue={templates[0]}>
              {templates.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <button type="button">Queue Export Placeholder</button>
        </div>
      </Section>
      <Section title="Available Reports">
        <DataTable rows={rows} columns={[{ key: "name", label: "Report" }, { key: "status", label: "Status" }]} />
      </Section>
    </Shell>
  );
}
