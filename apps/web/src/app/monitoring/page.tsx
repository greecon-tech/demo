import { MetricGrid } from "../../components/MetricGrid";
import { Section } from "../../components/Section";
import { Shell } from "../../components/Shell";
import { apiGet } from "../../lib/api";
import { Metric } from "../../lib/types";

interface TelemetryReading {
  canonicalName: string;
  value: number | boolean | string;
  unit: string;
  quality: string;
}

export default async function MonitoringPage() {
  const readings = await apiGet<TelemetryReading[]>("/telemetry/latest");
  const energy = readings.filter((reading) => reading.canonicalName.startsWith("energy."));
  const water = readings.filter((reading) => reading.canonicalName.startsWith("water."));
  const agriculture = readings.filter((reading) => reading.canonicalName.startsWith("agri."));

  return (
    <Shell title="Monitoring" subtitle="Current operating state across energy, water, agriculture, and environmental points.">
      <Section title="Energy">
        <MetricGrid metrics={toMetrics(energy)} />
      </Section>
      <Section title="Water">
        <MetricGrid metrics={toMetrics(water)} />
      </Section>
      <Section title="Agriculture">
        <MetricGrid metrics={toMetrics(agriculture)} />
      </Section>
    </Shell>
  );
}

function toMetrics(readings: TelemetryReading[]): Metric[] {
  return readings.map((reading) => ({
    label: reading.canonicalName,
    value: typeof reading.value === "number" ? reading.value.toFixed(1) : String(reading.value),
    unit: reading.unit,
    status: reading.quality === "OK" ? "OK" : reading.quality === "WARN" ? "Watch" : "Critical",
    note: `Quality: ${reading.quality}`
  }));
}
