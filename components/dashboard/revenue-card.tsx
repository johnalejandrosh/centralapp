"use client";

import { CCard, CCardBody } from "@coreui/react";
import { CChart } from "@coreui/react-chartjs";
import { revenueSeries, type Range } from "@/lib/mock/dashboard";
import { useThemeSignature } from "@/lib/theme/color-mode";
import { cssVar, withAlpha } from "./chart-colors";

export function RevenueCard({ range, caption }: { range: Range; caption: string }) {
  const theme = useThemeSignature();
  const series = revenueSeries[range];

  const bar = cssVar("--app-chart-1", "#eab308");
  const target = cssVar("--app-chart-target", "#1c1917");
  const text = cssVar("--cui-secondary-color", "#57534e");
  const grid = cssVar("--cui-border-color", "#e7e5e4");

  return (
    <CCard className="h-100">
      <CCardBody>
        <div className="card-title-row">
          <div>
            <h2>Ingresos vs. meta</h2>
            <div className="small text-body-secondary">{caption} · en miles de USD</div>
          </div>
          <div className="d-flex gap-3 small text-body-secondary">
            <span className="d-inline-flex align-items-center gap-2">
              <span className="legend-dot" style={{ background: bar }} /> Ingresos
            </span>
            <span className="d-inline-flex align-items-center gap-2" style={{ color: target }}>
              <span className="legend-line" />
              <span className="text-body-secondary">Meta</span>
            </span>
          </div>
        </div>

        <CChart
          key={`${theme}-${range}`}
          type="bar"
          style={{ height: 300 }}
          fallbackContent={<p>Ingresos frente a la meta para {caption.toLowerCase()}.</p>}
          data={{
            labels: series.labels,
            datasets: [
              {
                type: "bar",
                label: "Ingresos",
                data: series.revenue,
                backgroundColor: bar,
                hoverBackgroundColor: withAlpha(bar, 0.8),
                borderRadius: 8,
                borderSkipped: false,
                maxBarThickness: 34,
                order: 2,
              },
              {
                type: "line",
                label: "Meta",
                data: series.target,
                borderColor: target,
                borderDash: [6, 5],
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.35,
                order: 1,
              },
            ],
          }}
          options={{
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            interaction: { mode: "index", intersect: false },
            scales: {
              x: { grid: { display: false }, border: { display: false }, ticks: { color: text } },
              y: {
                beginAtZero: true,
                border: { display: false },
                grid: { color: grid },
                ticks: { color: text, maxTicksLimit: 5, callback: (value) => `$${value}k` },
              },
            },
          }}
        />
      </CCardBody>
    </CCard>
  );
}
