import { TimeSeriesPoint } from "../components/TimeSeriesChart";

interface TelemetryReadingLike {
  timestampUtc: string;
  canonicalName: string;
  value: number | boolean | string;
}

/** Shared by every page that turns a /telemetry/history response into per-metric chart series
 * (Analytics, its static twin, and each site's own Trends section) — non-numeric readings (a
 * write-only command point's state, e.g.) have no meaningful line to plot, so they're dropped. */
export function groupByCanonicalName(readings: readonly TelemetryReadingLike[]): Map<string, TimeSeriesPoint[]> {
  const grouped = new Map<string, TimeSeriesPoint[]>();
  for (const reading of readings) {
    if (typeof reading.value !== "number") continue;
    const series = grouped.get(reading.canonicalName) ?? [];
    series.push({ timestampUtc: reading.timestampUtc, value: reading.value });
    grouped.set(reading.canonicalName, series);
  }
  return grouped;
}
