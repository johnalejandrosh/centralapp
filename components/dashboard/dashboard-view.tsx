"use client";

import { useState } from "react";
import { CButton, CCol, CNav, CNavItem, CNavLink, CRow } from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilCloudDownload } from "@coreui/icons";
import { useSession } from "@/components/providers/session-provider";
import { getKpis, ranges, recentOrders, type Range } from "@/lib/mock/dashboard";
import { ActivityCard } from "./activity-card";
import { ChannelsCard } from "./channels-card";
import { KpiCard } from "./kpi-card";
import { OrdersCard } from "./orders-card";
import { RevenueCard } from "./revenue-card";

/** Descarga un CSV con los KPIs del periodo y los pedidos recientes. */
function exportCsv(range: Range) {
  const caption = ranges.find((option) => option.id === range)?.caption ?? range;
  const rows = [
    ["Indicador", "Valor", "Variación", "Periodo"],
    ...getKpis(range).map((kpi) => [kpi.label, kpi.value, kpi.deltaLabel, caption]),
    [],
    ["Pedido", "Cliente", "Correo", "Fecha", "Estado", "Monto"],
    ...recentOrders.map((order) => [order.id, order.customer, order.email, order.date, order.status, order.amount]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";")).join("\n");
  // BOM para que Excel abra bien las tildes.
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: `centralapp-resumen-${range}.csv` });
  link.click();
  URL.revokeObjectURL(url);
}

export function DashboardView() {
  const { user } = useSession();
  const [range, setRange] = useState<Range>("30d");

  const kpis = getKpis(range);
  const caption = ranges.find((option) => option.id === range)!.caption;
  const firstName = user.name.split(" ")[0];
  const ordersLabel = kpis.find((kpi) => kpi.id === "orders")?.value ?? "";

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow mb-0">{caption}</p>
          <h1>
            Hola{firstName && (
              <>
                , <span className="highlight">{firstName}</span>
              </>
            )}
          </h1>
          <p className="text-body-secondary mb-0">Así va tu negocio. Los datos son de ejemplo hasta conectar el backend.</p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <CNav variant="enclosed-pills" role="group" aria-label="Periodo">
            {ranges.map((option) => (
              <CNavItem key={option.id}>
                <CNavLink
                  as="button"
                  type="button"
                  active={range === option.id}
                  aria-pressed={range === option.id}
                  onClick={() => setRange(option.id)}
                >
                  {option.label}
                </CNavLink>
              </CNavItem>
            ))}
          </CNav>
          <CButton color="primary" className="d-inline-flex align-items-center gap-2" onClick={() => exportCsv(range)}>
            <CIcon icon={cilCloudDownload} />
            Exportar CSV
          </CButton>
        </div>
      </header>

      <CRow className="g-3 g-xl-4 mb-3 mb-xl-4">
        {kpis.map((kpi) => (
          <CCol key={kpi.id} xs={12} sm={6} xl={3}>
            <KpiCard kpi={kpi} />
          </CCol>
        ))}
      </CRow>

      <CRow className="g-3 g-xl-4 mb-3 mb-xl-4">
        <CCol xs={12} lg={8}>
          <RevenueCard range={range} caption={caption} />
        </CCol>
        <CCol xs={12} lg={4}>
          <ChannelsCard ordersLabel={ordersLabel} />
        </CCol>
      </CRow>

      <CRow className="g-3 g-xl-4">
        <CCol xs={12} xl={8}>
          <OrdersCard />
        </CCol>
        <CCol xs={12} xl={4}>
          <ActivityCard />
        </CCol>
      </CRow>
    </>
  );
}
