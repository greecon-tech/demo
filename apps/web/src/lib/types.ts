export type Status = "OK" | "Watch" | "Warning" | "Critical" | "Offline" | "Simulated" | "Manual Override";

export interface Metric {
  label: string;
  value: string;
  unit?: string;
  status: Status | string;
  note: string;
}
