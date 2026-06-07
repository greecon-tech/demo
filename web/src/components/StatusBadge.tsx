import { Status } from "../lib/demo-data";

export function StatusBadge({ status }: { status: Status | string }) {
  const className = `status status-${normalizeStatus(status)}`;
  return <span className={className}>{status}</span>;
}

function normalizeStatus(status: string): string {
  return status.toLowerCase().replace(/\s+/g, "-");
}
