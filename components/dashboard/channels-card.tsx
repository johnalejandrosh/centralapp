"use client";

import { CCard, CCardBody } from "@coreui/react";
import { CChartDoughnut } from "@coreui/react-chartjs";
import type { ChartOptions } from "chart.js";
import { channels } from "@/lib/mock/dashboard";
import { useThemeSignature } from "@/lib/theme/color-mode";
import { cssVar } from "./chart-colors";

const COLOR_VARS = ["--app-chart-1", "--app-chart-2", "--app-chart-3", "--app-chart-4"];
const FALLBACKS = ["#eab308", "#f97316", "#0ea5e9", "#ec4899"];

// `cutout` es propia del doughnut; las props de CChart usan el tipo genérico de opciones.
const DONUT_OPTIONS: ChartOptions<"doughnut"> = {
  cutout: "74%",
  plugins: { legend: { display: false } },
};

export function ChannelsCard({ ordersLabel }: { ordersLabel: string }) {
  const theme = useThemeSignature();
  const colors = COLOR_VARS.map((name, index) => cssVar(name, FALLBACKS[index]));
  const cardBg = cssVar("--app-card-bg", "#fff");

  return (
    <CCard className="h-100">
      <CCardBody>
        <div className="card-title-row">
          <div>
            <h2>Canales de venta</h2>
            <div className="small text-body-secondary">Participación por pedidos</div>
          </div>
        </div>

        <div className="donut mb-4">
          <CChartDoughnut
            key={theme}
            fallbackContent={<p>Distribución de pedidos por canal.</p>}
            data={{
              labels: channels.map((channel) => channel.label),
              datasets: [
                {
                  data: channels.map((channel) => channel.value),
                  backgroundColor: colors,
                  borderColor: cardBg,
                  borderWidth: 4,
                  hoverOffset: 6,
                },
              ],
            }}
            options={DONUT_OPTIONS as ChartOptions}
          />
          <div className="donut__center">
            <span className="donut__value">{ordersLabel}</span>
            <span className="small text-body-secondary">pedidos</span>
          </div>
        </div>

        <ul className="list-unstyled d-grid gap-2 mb-0">
          {channels.map((channel, index) => (
            <li key={channel.label} className="d-flex align-items-center gap-2">
              <span className="legend-dot" style={{ background: colors[index] }} />
              <span className="text-body-secondary">{channel.label}</span>
              <span className="ms-auto fw-semibold">{channel.value}%</span>
            </li>
          ))}
        </ul>
      </CCardBody>
    </CCard>
  );
}
