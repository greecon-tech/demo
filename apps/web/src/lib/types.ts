export type Status = "OK" | "Watch" | "Warning" | "Critical" | "Offline" | "Simulated" | "Manual Override";

export interface Metric {
  label: string;
  value: string;
  unit?: string;
  status: Status | string;
  note: string;
  /** Display size on the Overview grid — set from a saved dashboard preference
   * (lib/dashboard-preferences.ts); omitted means the default medium size. */
  size?: "small" | "medium" | "large";
}
