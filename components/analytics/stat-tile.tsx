"use client";

import type { ReactNode } from "react";

type Trend = (number | null)[];

/** Línea de tendencia mínima en SVG: la serie en gris y el último punto en el color de acento. */
function Sparkline({ values, label }: { values: Trend; label: string }) {
  const points = values.map((value, index) => ({ index, value })).filter((point): point is { index: number; value: number } => point.value !== null);
  if (points.length < 2) return null;

  const width = 96;
  const height = 32;
  const max = Math.max(...points.map((point) => point.value));
  const min = Math.min(0, ...points.map((point) => point.value));
  const span = max - min || 1;
  const x = (index: number) => (index / Math.max(1, values.length - 1)) * (width - 8) + 4;
  const y = (value: number) => height - 4 - ((value - min) / span) * (height - 8);
  const path = points.map((point, i) => `${i === 0 ? "M" : "L"}${x(point.index).toFixed(1)},${y(point.value).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];

  return (
    <svg className="stat-tile__spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={label}>
      <path d={path} fill="none" stroke="var(--viz-deemph)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(last.index)} cy={y(last.value)} r="3" fill="var(--viz-series)" stroke="var(--app-card-bg)" strokeWidth="1.5" />
    </svg>
  );
}

type StatTileProps = {
  label: string;
  value: string;
  /** Variación ya formateada y si es buena o mala (el color depende de ambas). */
  delta?: { text: string; direction: "up" | "down" | "flat"; good: boolean | null; vs: string } | null;
  /** Texto bajo la cifra cuando no hay comparación (p. ej. "1 de 207 pedidos"). */
  hint?: ReactNode;
  trend?: Trend;
  trendLabel?: string;
};

export function StatTile({ label, value, delta, hint, trend, trendLabel }: StatTileProps) {
  const tone = !delta || delta.good === null || delta.direction === "flat" ? "is-neutral" : delta.good ? "is-good" : "is-bad";
  const arrow = delta?.direction === "up" ? "▲" : delta?.direction === "down" ? "▼" : "•";

  return (
    <div className="stat-tile">
      <span className="stat-tile__label">{label}</span>
      <div className="stat-tile__main">
        <span className="stat-tile__value">{value}</span>
        {trend && <Sparkline values={trend} label={trendLabel ?? `Tendencia de ${label.toLowerCase()}`} />}
      </div>
      {delta ? (
        <span className="stat-tile__delta">
          <span className={`stat-tile__change ${tone}`}>
            <span aria-hidden="true">{arrow}</span> {delta.text}
          </span>{" "}
          <span className="stat-tile__vs">vs. {delta.vs}</span>
        </span>
      ) : (
        hint && <span className="stat-tile__delta stat-tile__vs">{hint}</span>
      )}
    </div>
  );
}
