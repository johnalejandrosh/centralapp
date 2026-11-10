"use client";

import { CCard, CCardBody } from "@coreui/react";
import { CChartLine } from "@coreui/react-chartjs";
import type { ScriptableContext } from "chart.js";
import CIcon from "@coreui/icons-react";
import { cilArrowBottom, cilArrowTop, cilCart, cilDollar, cilTag, cilUserPlus } from "@coreui/icons";
import type { Kpi, KpiTone } from "@/lib/mock/dashboard";
import { useThemeSignature } from "@/lib/theme/color-mode";
import { cssVar, withAlpha } from "./chart-colors";

const toneVar = (tone: KpiTone) => `--app-chart-${tone}`;

const ICONS: Record<string, string[]> = {
  revenue: cilDollar,
  orders: cilCart,
  customers: cilUserPlus,
  ticket: cilTag,
};

function Sparkline({ kpi }: { kpi: Kpi }) {
  const theme = useThemeSignature();
  const color = cssVar(toneVar(kpi.tone), "#eab308");

  return (
    <CChartLine
      key={theme}
      className="kpi-card__spark"
      customTooltips={false}
      fallbackContent={<span>Tendencia de {kpi.label.toLowerCase()}</span>}
      data={{
        labels: kpi.series.map((_, index) => index + 1),
        datasets: [
          {
            data: kpi.series,
            borderColor: color,
            // Degradado vertical calculado por Chart.js con el área real del gráfico.
            backgroundColor: ({ chart }: ScriptableContext<"line">) => {
              const { ctx, chartArea } = chart;
              if (!chartArea) return withAlpha(color, 0.15);
              const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, withAlpha(color, 0.38));
              gradient.addColorStop(1, withAlpha(color, 0));
              return gradient;
            },
            fill: true,
            borderWidth: 2.5,
            tension: 0.4,
            pointRadius: 0,
          },
        ],
      }}
      options={{
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
      }}
    />
  );
}

export function KpiCard({ kpi }: { kpi: Kpi }) {
  const up = kpi.delta >= 0;
  const toneClass = kpi.tone === 1 ? "" : `kpi-card--c${kpi.tone}`;

  return (
    <CCard className={`kpi-card ${toneClass}`}>
      <CCardBody>
        <div className="d-flex align-items-center justify-content-between">
          <span className="kpi-card__icon">
            <CIcon icon={ICONS[kpi.id] ?? cilDollar} />
          </span>
          <span className={`delta ${up ? "delta--up" : "delta--down"}`}>
            <CIcon icon={up ? cilArrowTop : cilArrowBottom} size="sm" />
            {kpi.deltaLabel}
            <span className="visually-hidden">{up ? " de aumento" : " de disminución"} frente al periodo anterior</span>
          </span>
        </div>
        <div>
          <div className="kpi-card__label">{kpi.label}</div>
          <div className="kpi-card__value">{kpi.value}</div>
        </div>
        <Sparkline kpi={kpi} />
      </CCardBody>
    </CCard>
  );
}
