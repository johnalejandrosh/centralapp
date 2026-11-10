"use client";

import {
  CAvatar,
  CBadge,
  CCard,
  CCardBody,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from "@coreui/react";
import { initials } from "@/lib/initials";
import { recentOrders, type OrderStatus } from "@/lib/mock/dashboard";

const STATUS_TONE: Record<OrderStatus, string> = {
  Pagado: "success",
  Enviado: "info",
  Pendiente: "warning",
  Cancelado: "secondary",
};

const AVATAR_TONES = ["primary", "warning", "info", "danger", "success"];

export function OrdersCard() {
  return (
    <CCard className="h-100">
      <CCardBody>
        <div className="card-title-row">
          <div>
            <h2>Pedidos recientes</h2>
            <div className="small text-body-secondary">Los últimos movimientos de tu tienda</div>
          </div>
          <span className="small text-body-tertiary">Ver todos (pronto)</span>
        </div>

        <CTable className="table-orders" align="middle" hover responsive>
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell scope="col">Pedido</CTableHeaderCell>
              <CTableHeaderCell scope="col">Cliente</CTableHeaderCell>
              <CTableHeaderCell scope="col">Fecha</CTableHeaderCell>
              <CTableHeaderCell scope="col">Estado</CTableHeaderCell>
              <CTableHeaderCell scope="col" className="text-end">
                Monto
              </CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {recentOrders.map((order, index) => {
              const tone = STATUS_TONE[order.status];
              return (
                <CTableRow key={order.id}>
                  <CTableDataCell className="font-monospace small">#{order.id}</CTableDataCell>
                  <CTableDataCell>
                    <div className="d-flex align-items-center gap-2">
                      <CAvatar size="sm" className={`bg-${AVATAR_TONES[index % AVATAR_TONES.length]}-subtle text-body-emphasis fw-semibold`}>
                        {initials(order.customer)}
                      </CAvatar>
                      <div>
                        <div className="fw-medium">{order.customer}</div>
                        <div className="small text-body-secondary">{order.email}</div>
                      </div>
                    </div>
                  </CTableDataCell>
                  <CTableDataCell className="text-body-secondary">{order.date}</CTableDataCell>
                  <CTableDataCell>
                    <CBadge className={`bg-${tone}-subtle text-${tone}-emphasis`}>{order.status}</CBadge>
                  </CTableDataCell>
                  <CTableDataCell className="text-end fw-semibold">{order.amount}</CTableDataCell>
                </CTableRow>
              );
            })}
          </CTableBody>
        </CTable>
      </CCardBody>
    </CCard>
  );
}
