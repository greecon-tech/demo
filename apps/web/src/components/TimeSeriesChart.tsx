"use client";

import { PointerEvent, useRef, useState } from "react";

export interface TimeSeriesPoint {
  timestampUtc: string;
  value: number;
}

const WIDTH = 320;
const HEIGHT = 150;
const PAD_LEFT = 38;
const PAD_RIGHT = 10;
const PAD_TOP = 10;
const PAD_BOTTOM = 22;
const PLOT_WIDTH = WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = HEIGHT - PAD_TOP - PAD_BOTTOM;

// Hand-rolled rather than pulling in a charting library — matches the rest of the web app's
// approach to visuals (see SensorMap.tsx's hand-rolled field layout). Follows the platform
// dataviz method: one hue per single-series card (no legend needed for one series), a recessive
// hairline grid carrying the values that aren't directly labeled, a value at the line's end
// instead of only in the header, and a hover crosshair + tooltip so any point's exact value and
// time is always reachable, not just the shape of the trend.
export function TimeSeriesChart({ title, unit, data, color = "var(--accent-strong)" }: { title: string; unit: string; data: readonly TimeSeriesPoint[]; color?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

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
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const ticks = niceTicks(rawMin, rawMax, 4);
  const axisMin = ticks[0] as number;
  const axisMax = ticks[ticks.length - 1] as number;
  const axisRange = axisMax - axisMin || 1;

  const times = data.map((point) => Date.parse(point.timestampUtc));
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const timeRange = maxTime - minTime || 1;

  function xFor(timestampUtc: string): number {
    return PAD_LEFT + ((Date.parse(timestampUtc) - minTime) / timeRange) * PLOT_WIDTH;
  }
  function yFor(value: number): number {
    return PAD_TOP + PLOT_HEIGHT - ((value - axisMin) / axisRange) * PLOT_HEIGHT;
  }

  const linePoints = data.map((point) => `${xFor(point.timestampUtc).toFixed(1)},${yFor(point.value).toFixed(1)}`).join(" ");
  const areaPoints = `${PAD_LEFT},${PAD_TOP + PLOT_HEIGHT} ${linePoints} ${xFor((data[data.length - 1] as TimeSeriesPoint).timestampUtc).toFixed(1)},${PAD_TOP + PLOT_HEIGHT}`;

  // data.length === 0 already returned above, so the last element is guaranteed to exist here.
  const latest = data[data.length - 1] as TimeSeriesPoint;
  const hovered = hoverIndex !== null ? data[hoverIndex] : undefined;

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const targetTime = minTime + ((relativeX - PAD_LEFT) / PLOT_WIDTH) * timeRange;

    let nearest = 0;
    let nearestDistance = Infinity;
    data.forEach((point, index) => {
      const distance = Math.abs(Date.parse(point.timestampUtc) - targetTime);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = index;
      }
    });
    setHoverIndex(nearest);
  }

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <strong>{title}</strong>
        <span className="chart-card__latest">
          {formatValue(latest.value)} <small>{unit}</small>
        </span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="chart-card__svg"
        role="img"
        aria-label={`${title} over the selected period, ranging from ${formatValue(rawMin)} to ${formatValue(rawMax)} ${unit}`}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD_LEFT} y1={yFor(tick)} x2={WIDTH - PAD_RIGHT} y2={yFor(tick)} className="chart-card__gridline" />
            <text x={PAD_LEFT - 6} y={yFor(tick)} className="chart-card__tick" textAnchor="end" dominantBaseline="middle">
              {formatValue(tick)}
            </text>
          </g>
        ))}

        <polygon points={areaPoints} fill={color} fillOpacity="0.1" stroke="none" />
        <polyline points={linePoints} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* End marker: value at the line's end, per the dataviz mark spec, not just in the header. */}
        <circle cx={xFor(latest.timestampUtc)} cy={yFor(latest.value)} r="4" fill={color} stroke="var(--bg-card)" strokeWidth="2" />

        {hovered ? (
          <>
            <line x1={xFor(hovered.timestampUtc)} y1={PAD_TOP} x2={xFor(hovered.timestampUtc)} y2={PAD_TOP + PLOT_HEIGHT} className="chart-card__crosshair" />
            <circle cx={xFor(hovered.timestampUtc)} cy={yFor(hovered.value)} r="4" fill={color} stroke="var(--bg-card)" strokeWidth="2" />
          </>
        ) : null}

        <text x={PAD_LEFT} y={HEIGHT - 4} className="chart-card__tick" textAnchor="start">
          {formatTime(data[0] as TimeSeriesPoint)}
        </text>
        <text x={WIDTH - PAD_RIGHT} y={HEIGHT - 4} className="chart-card__tick" textAnchor="end">
          {formatTime(latest)}
        </text>
      </svg>
      {hovered ? (
        <div className="chart-card__tooltip" role="status">
          <strong>
            {formatValue(hovered.value)} {unit}
          </strong>
          <span>{formatTime(hovered)}</span>
        </div>
      ) : null}
    </div>
  );
}

/** Classic "nice numbers" tick generation: rounds the axis bounds to clean steps (1/2/5 × 10^n)
 * instead of the raw min/max, so a y-axis reads "0 / 25 / 50 / 75" rather than "3.2 / 41.7 / …". */
function niceTicks(rawMin: number, rawMax: number, targetCount: number): number[] {
  if (rawMin === rawMax) {
    const pad = rawMin === 0 ? 1 : Math.abs(rawMin) * 0.1;
    rawMin -= pad;
    rawMax += pad;
  }

  const range = niceNumber(rawMax - rawMin, false);
  const step = niceNumber(range / (targetCount - 1), true);
  const niceMin = Math.floor(rawMin / step) * step;
  const niceMax = Math.ceil(rawMax / step) * step;

  const ticks: number[] = [];
  for (let value = niceMin; value <= niceMax + step / 2; value += step) {
    ticks.push(Math.round(value * 1000) / 1000);
  }
  return ticks;
}

function niceNumber(value: number, round: boolean): number {
  const exponent = Math.floor(Math.log10(value || 1));
  const fraction = value / 10 ** exponent;
  let niceFraction: number;

  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }

  return niceFraction * 10 ** exponent;
}

function formatValue(value: number): string {
  return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(1);
}

function formatTime(point: TimeSeriesPoint): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(point.timestampUtc));
}
