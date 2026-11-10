"use client";

import { useMemo, useRef } from "react";
import { CChart } from "@coreui/react-chartjs";
import type { Chart, ChartOptions, Plugin, TooltipModel } from "chart.js";
import { cssVar, withAlpha } from "@/components/dashboard/chart-colors";
import { useThemeSignature } from "@/lib/theme/color-mode";
import { dayLabel, dayLabelLong } from "./format";

type TrendChartProps = {
  days: string[];
  current: (number | null)[];
  /** Período anterior alineado por posición (día 1 con día 1); `null` si no se compara. */
  previous: { days: string[]; values: (number | null)[] } | null;
  format: (value: number) => string;
  /** Formato corto para el eje Y. */
  formatAxis: (value: number) => string;
  label: string;
};

/** Línea vertical que sigue al puntero y marca el día activo. */
const crosshair: Plugin<"line"> = {
  id: "crosshair",
  afterDatasetsDraw(chart) {
    const active = chart.tooltip?.getActiveElements() ?? [];
    if (active.length === 0) return;
    const { ctx, chartArea } = chart;
    const x = active[0].element.x;
    ctx.save();
    ctx.strokeStyle = cssVar("--viz-axis", "#c3c2b7");
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(x) + 0.5, chartArea.top);
    ctx.lineTo(Math.round(x) + 0.5, chartArea.bottom);
    ctx.stroke();
    ctx.restore();
  },
};

/** Espacio a la derecha para la etiqueta final; en pantallas angostas no se dibuja. */
const END_LABEL_SPACE = 96;
const hasRoomForEndLabel = (chart: Chart) => chart.width >= 480;

/** Valor del último día a la derecha del final de la serie actual (etiqueta directa selectiva). */
function endLabel(format: (value: number) => string): Plugin<"line"> {
  return {
    id: "endLabel",
    afterDatasetsDraw(chart) {
      if (!hasRoomForEndLabel(chart as unknown as Chart)) return;
      const meta = chart.getDatasetMeta(0);
      const data = chart.data.datasets[0]?.data as (number | null)[] | undefined;
      if (!meta || !data) return;
      let index = data.length - 1;
      while (index >= 0 && data[index] === null) index--;
      if (index < 0) return;
      const point = meta.data[index];
      const { ctx } = chart;
      ctx.save();
      // Punto final con anillo del color de la superficie.
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = cssVar("--viz-series", "#2a78d6");
      ctx.strokeStyle = cssVar("--app-card-bg", "#ffffff");
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      ctx.font = "600 12px system-ui, -apple-system, 'Segoe UI', sans-serif";
      ctx.fillStyle = cssVar("--cui-emphasis-color", "#0b0b0b");
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(format(data[index] as number), point.x + 9, point.y);
      ctx.restore();
    },
  };
}

export function TrendChart({ days, current, previous, format, formatAxis, label }: TrendChartProps) {
  const theme = useThemeSignature();
  const tooltipRef = useRef<HTMLDivElement>(null);

  const colors = {
    series: cssVar("--viz-series", "#2a78d6"),
    deemph: cssVar("--viz-deemph", "#898781"),
    grid: cssVar("--viz-grid", "#e1e0d9"),
    muted: cssVar("--viz-muted", "#898781"),
    surface: cssVar("--app-card-bg", "#ffffff"),
  };
  const showPoints = days.length <= 14;

  const data = useMemo(
    () => ({
      labels: days.map(dayLabel),
      datasets: [
        {
          label: "Este período",
          data: current,
          borderColor: colors.series,
          backgroundColor: withAlpha(colors.series, 0.1),
          fill: "origin" as const,
          borderWidth: 2,
          tension: 0.25,
          spanGaps: true,
          pointRadius: showPoints ? 4 : 0,
          pointBackgroundColor: colors.series,
          pointBorderColor: colors.surface,
          pointBorderWidth: 2,
          pointHoverRadius: 5,
          pointHoverBorderWidth: 2,
          pointHitRadius: 12,
          order: 1,
        },
        ...(previous
          ? [
              {
                label: "Período anterior",
                data: previous.values,
                borderColor: colors.deemph,
                backgroundColor: "transparent",
                fill: false,
                borderWidth: 2,
                tension: 0.25,
                spanGaps: true,
                pointRadius: 0,
                pointHoverRadius: 4,
                pointBackgroundColor: colors.deemph,
                pointBorderColor: colors.surface,
                pointHoverBorderWidth: 2,
                pointHitRadius: 12,
                order: 2,
              },
            ]
          : []),
      ],
    }),
    // `theme` cambia los colores leídos de CSS.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [days, current, previous, theme],
  );

  const options = useMemo<ChartOptions<"line">>(() => {
    /** Tooltip en HTML: el valor primero y el nombre de la serie después, con clave de línea. */
    const external = ({ chart, tooltip }: { chart: Chart; tooltip: TooltipModel<"line"> }) => {
      const element = tooltipRef.current;
      if (!element) return;
      if (tooltip.opacity === 0 || tooltip.dataPoints.length === 0) {
        element.style.opacity = "0";
        return;
      }
      const index = tooltip.dataPoints[0].dataIndex;
      element.replaceChildren();
      const title = document.createElement("div");
      title.className = "viz-tooltip__title";
      title.textContent = dayLabelLong(days[index]);
      element.append(title);

      const rows: { color: string; value: number | null; name: string }[] = [
        { color: colors.series, value: current[index], name: "Este período" },
      ];
      if (previous) {
        rows.push({ color: colors.deemph, value: previous.values[index] ?? null, name: `Anterior · ${dayLabel(previous.days[index] ?? days[index])}` });
      }
      for (const row of rows) {
        const line = document.createElement("div");
        line.className = "viz-tooltip__row";
        const key = document.createElement("span");
        key.className = "viz-tooltip__key";
        key.style.background = row.color;
        const value = document.createElement("strong");
        value.textContent = row.value === null ? "—" : format(row.value);
        const name = document.createElement("span");
        name.className = "viz-tooltip__name";
        name.textContent = row.name;
        line.append(key, value, name);
        element.append(line);
      }

      const { offsetWidth: width } = element;
      const x = tooltip.caretX;
      const left = x + 16 + width > chart.width ? x - width - 16 : x + 16;
      element.style.opacity = "1";
      element.style.transform = `translate(${Math.max(0, left)}px, ${Math.max(0, tooltip.caretY - 24)}px)`;
    };

    return {
      maintainAspectRatio: false,
      animation: { duration: 250 },
      interaction: { mode: "index", intersect: false },
      layout: { padding: (context) => ({ top: 12, right: hasRoomForEndLabel(context.chart) ? END_LABEL_SPACE : 4 }) },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false, external },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: colors.grid },
          ticks: { color: colors.muted, maxRotation: 0, autoSkip: true, maxTicksLimit: 8, font: { size: 12 } },
        },
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: colors.grid, lineWidth: 1 },
          ticks: { color: colors.muted, maxTicksLimit: 5, padding: 8, font: { size: 12 }, callback: (value) => formatAxis(Number(value)) },
        },
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, current, previous, format, formatAxis, theme]);

  const plugins = useMemo(() => [crosshair, endLabel(format)], [format]);

  return (
    <div className="viz-trend">
      <div className="viz-legend" aria-hidden={!previous}>
        <span className="viz-legend__item">
          <span className="viz-legend__line" style={{ background: colors.series }} /> Este período
        </span>
        {previous && (
          <span className="viz-legend__item">
            <span className="viz-legend__line" style={{ background: colors.deemph }} /> Período anterior
          </span>
        )}
      </div>
      <div className="viz-trend__plot">
        <CChart
          key={theme}
          type="line"
          customTooltips={false}
          data={data}
          // Las props de CChart usan el tipo genérico de opciones de Chart.js.
          options={options as ChartOptions}
          plugins={plugins as Plugin[]}
          fallbackContent={<p>{label}</p>}
          aria-label={label}
          role="img"
          style={{ height: "100%" }}
        />
        <div ref={tooltipRef} className="viz-tooltip" role="presentation" />
      </div>
    </div>
  );
}
