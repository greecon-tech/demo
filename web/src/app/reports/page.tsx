import { DataTable } from "../../components/DataTable";
import { Section } from "../../components/Section";
import { Shell } from "../../components/Shell";
import { reportTypes } from "../../lib/demo-data";

export default function ReportsPage() {
  return (
    <Shell title="Reports" subtitle="Operational, sustainability, audit, and incident evidence.">
      <Section title="Generate Report">
        <div className="panel stack">
          <label>
            Report type
            <select defaultValue="Operational report">
              {reportTypes.map((report) => (
                <option key={report.name}>{report.name}</option>
              ))}
            </select>
          </label>
          <button type="button">Queue Export Placeholder</button>
        </div>
      </Section>
      <Section title="Available Reports">
        <DataTable
          rows={reportTypes}
          columns={[
            { key: "name", label: "Report" },
            { key: "scope", label: "Scope" },
            { key: "status", label: "Status" }
          ]}
        />
      </Section>
    </Shell>
  );
}
