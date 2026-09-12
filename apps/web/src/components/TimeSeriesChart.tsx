export interface TimeSeriesPoint {
  timestampUtc: string;
  value: number;
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 120;
const PAD_X = 6;
const PAD_Y = 14;

// Hand-rolled rather than pulling in a charting library — matches the rest of the web app's
// approach to visuals (see SensorMap.tsx's hand-rolled field layout): no new dependency, and a
// plain line is all a resource trend needs. Renders nothing fancier than an SVG polyline plus
// min/max/latest labels, which is enough to answer "is this going up or down" at a glance.
export function TimeSeriesChart({ title, unit, data, color = "var(--accent-strong)" }: { title: string; unit: string; data: readonly TimeSeriesPoint[]; color?: string }) {
  if (data.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-card__header">
          <strong>{title}</strong>
        </div>
        <div className="empty-state">No data yet for this period</div>
      </div>
    );
  }

  const values = data.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  const times = data.map((point) => Date.parse(point.timestampUtc));
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const timeRange = maxTime - minTime || 1;

  const points = data
    .map((point) => {
      const x = PAD_X + ((Date.parse(point.timestampUtc) - minTime) / timeRange) * (CHART_WIDTH - PAD_X * 2);
      const y = CHART_HEIGHT - PAD_Y - ((point.value - minValue) / range) * (CHART_HEIGHT - PAD_Y * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  // data.length === 0 already returned above, so the last element is guaranteed to exist here.
  const latest = data[data.length - 1] as TimeSeriesPoint;

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <strong>{title}</strong>
        <span className="chart-card__latest">
          {formatValue(latest.value)} <small>{unit}</small>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="chart-card__svg"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${title} over the selected period, ranging from ${formatValue(minValue)} to ${formatValue(maxValue)} ${unit}`}
      >
        <line x1={PAD_X} y1={CHART_HEIGHT - PAD_Y} x2={CHART_WIDTH - PAD_X} y2={CHART_HEIGHT - PAD_Y} className="chart-card__axis" />
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="chart-card__range">
        <span>
          Min {formatValue(minValue)} {unit}
        </span>
        <span>
          Max {formatValue(maxValue)} {unit}
        </span>
      </div>
    </div>
  );
}

function formatValue(value: number): string {
  return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(1);
}
