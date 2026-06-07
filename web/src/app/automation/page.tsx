import { DataTable } from "../../components/DataTable";
import { ManualOverridePanel } from "../../components/ManualOverridePanel";
import { Section } from "../../components/Section";
import { Shell } from "../../components/Shell";
import { StatusBadge } from "../../components/StatusBadge";
import { automationHistory, rules } from "../../lib/demo-data";

export default function AutomationPage() {
  return (
    <Shell title="Automation" subtitle="Rules, simulations, command safety, and human-readable action history.">
      <Section title="Rules">
        <DataTable
          rows={rules}
          columns={[
            { key: "name", label: "Rule" },
            { key: "priority", label: "Priority" },
            { key: "mode", label: "Execution" },
            { key: "state", label: "Approval" },
            { key: "result", label: "State", render: (row) => <StatusBadge status={String(row.result)} /> },
            { key: "explanation", label: "Explanation" }
          ]}
        />
      </Section>
      <div className="split">
        <Section title="Automation History">
          <DataTable
            rows={automationHistory}
            columns={[
              { key: "time", label: "Time" },
              { key: "rule", label: "Rule" },
              { key: "action", label: "Action" },
              { key: "safety", label: "Safety" },
              { key: "result", label: "Result" }
            ]}
          />
        </Section>
        <Section title="Manual Override">
          <ManualOverridePanel />
        </Section>
      </div>
    </Shell>
  );
}
