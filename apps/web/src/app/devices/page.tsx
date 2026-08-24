import { DataTable } from "../../components/DataTable";
import { Section } from "../../components/Section";
import { Shell } from "../../components/Shell";
import { StatusBadge } from "../../components/StatusBadge";
import { apiGet } from "../../lib/api";

interface Device {
  id: string;
  name: string;
  deviceType: string;
  protocol: string;
  driverType: string;
  health: string;
  lastSeenUtc?: string;
  secureIdentityStatus: string;
}

export default async function DevicesPage() {
  const devices = await apiGet<Device[]>("/devices");

  return (
    <Shell title="Devices" subtitle="Gateway, device, point, health, protocol, and quality state.">
      <Section title="Registry">
        <DataTable
          rows={devices}
          columns={[
            { key: "name", label: "Device" },
            { key: "deviceType", label: "Type" },
            { key: "protocol", label: "Protocol" },
            { key: "driverType", label: "Driver" },
            { key: "health", label: "Health", render: (row) => <StatusBadge status={row.health} /> },
            { key: "lastSeenUtc", label: "Last Seen" }
          ]}
        />
      </Section>
      <Section title="Configuration">
        <div className="empty-state">Configuration access is controlled by role. Certificate identity is reserved for gateway provisioning.</div>
      </Section>
    </Shell>
  );
}
