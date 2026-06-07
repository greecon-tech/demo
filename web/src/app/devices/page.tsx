import { DataTable } from "../../components/DataTable";
import { Section } from "../../components/Section";
import { Shell } from "../../components/Shell";
import { StatusBadge } from "../../components/StatusBadge";
import { devices } from "../../lib/demo-data";

export default function DevicesPage() {
  return (
    <Shell title="Devices" subtitle="Gateway, device, point, health, protocol, and quality state.">
      <Section title="Registry">
        <DataTable
          rows={devices}
          columns={[
            { key: "name", label: "Device" },
            { key: "asset", label: "Asset Binding" },
            { key: "protocol", label: "Protocol" },
            { key: "point", label: "Canonical Point" },
            { key: "health", label: "Health", render: (row) => <StatusBadge status={String(row.health)} /> },
            { key: "quality", label: "Quality", render: (row) => <StatusBadge status={String(row.quality)} /> },
            { key: "lastSeen", label: "Last Seen" }
          ]}
        />
      </Section>
      <Section title="Configuration">
        <div className="empty-state">Configuration access is controlled by role. Certificate identity is reserved for gateway provisioning.</div>
      </Section>
    </Shell>
  );
}
