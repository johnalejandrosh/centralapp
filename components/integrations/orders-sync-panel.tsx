"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  CAlert,
  CBadge,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCol,
  CForm,
  CFormInput,
  CFormSelect,
  CFormSwitch,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilCloudDownload } from "@coreui/icons";
import { LocalDate } from "@/components/admin/local-date";
import type { OrdersReport } from "@/lib/integrations/metrics";
import type { OrderStatus } from "@/lib/orders";
import { PROVIDERS, type ProviderId } from "@/lib/integrations/catalog";
import type { IntegrationRow } from "@/lib/server/integration-queries";

const STATUS_TONE: Record<OrderStatus, string> = {
  Pagado: "bg-success-subtle text-success-emphasis",
  Enviado: "bg-info-subtle text-info-emphasis",
  Pendiente: "bg-warning-subtle text-warning-emphasis",
  Cancelado: "bg-secondary-subtle text-secondary-emphasis",
};

const number = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const money = (value: number | null) => (value === null ? "—" : `$${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(value)}`);

/** YYYY-MM-DD en la zona horaria del navegador. */
function localDay(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const PRESETS = [
  { label: "7 días", days: 7 },
  { label: "30 días", days: 30 },
  { label: "90 días", days: 90 },
];

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="sync-kpi">
      <span className="sync-kpi__label">{label}</span>
      <span className="sync-kpi__value">{value}</span>
      {hint && <span className="sync-kpi__hint">{hint}</span>}
    </div>
  );
}

/**
 * Consulta el endpoint de órdenes del proveedor (Route Handler en el servidor) y cruza las órdenes con la
 * inversión que escribe el usuario. El navegador nunca habla directo con el proveedor.
 */
export function OrdersSyncPanel({ provider: providerId, integrations }: { provider: ProviderId; integrations: IntegrationRow[] }) {
  const provider = PROVIDERS[providerId];
  const usable = integrations.filter((integration) => integration.active && integration.apiKeyHint && integration.externalId);
  const [integrationId, setIntegrationId] = useState(usable[0]?.id ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<OrdersReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function applyPreset(days: number) {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    setFrom(localDay(start));
    setTo(localDay(end));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams({ limit: "50" });
    if (integrationId) params.set("integrationId", integrationId);
    // Días completos en la zona horaria del navegador.
    if (from) params.set("from", new Date(`${from}T00:00:00`).toISOString());
    if (to) params.set("to", new Date(`${to}T23:59:59.999`).toISOString());
    for (const key of ["spend", "product"] as const) {
      const value = String(form.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }
    if (form.get("onlyAds") === "on") params.set("onlyAds", "1");

    const url = `${provider.ordersEndpoint}?${params}`;
    startTransition(async () => {
      setError(null);
      try {
        const response = await fetch(url, { headers: { Accept: "application/json" } });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          setError(body?.error ?? `La consulta falló (HTTP ${response.status}).`);
          return;
        }
        setReport(body as OrdersReport);
        setLastQuery(url);
      } catch {
        setError("No se pudo contactar al servidor.");
      }
    });
  }

  if (usable.length === 0) {
    return (
      <CCard>
        <CCardBody>
          <div className="profile-section-head">
            <div>
              <h2>Probar sincronización</h2>
              <p>Consulta órdenes reales y calcula el CPA con tu inversión.</p>
            </div>
          </div>
          <div className="integration-empty">
            <p className="small text-body-secondary mb-0">Conecta y activa una tienda para consultar sus órdenes.</p>
          </div>
        </CCardBody>
      </CCard>
    );
  }

  const summary = report?.summary;

  return (
    <CCard>
      <CCardBody>
        <div className="profile-section-head">
          <div>
            <h2>Probar sincronización</h2>
            <p>Trae las órdenes del período y cruza el resultado con lo que invertiste en pauta.</p>
          </div>
        </div>

        <CForm onSubmit={submit} className="sync-form">
          <CRow className="g-3">
            {usable.length > 1 && (
              <CCol xs={12}>
                <CFormSelect id="sync-integration" label="Tienda" value={integrationId} onChange={(event) => setIntegrationId(event.target.value)}>
                  {usable.map((integration) => (
                    <option key={integration.id} value={integration.id}>
                      {integration.name} ({integration.externalId})
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            )}
            <CCol sm={6}>
              <CFormInput id="sync-from" type="date" label="Desde" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} />
            </CCol>
            <CCol sm={6}>
              <CFormInput id="sync-to" type="date" label="Hasta" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} />
            </CCol>
            <CCol xs={12} className="d-flex flex-wrap align-items-center gap-2">
              <CButtonGroup size="sm" role="group" aria-label="Rangos rápidos">
                {PRESETS.map((preset) => (
                  <CButton key={preset.days} color="secondary" variant="outline" onClick={() => applyPreset(preset.days)}>
                    {preset.label}
                  </CButton>
                ))}
              </CButtonGroup>
              <span className="small text-body-tertiary">Sin fechas se consultan los últimos 7 días.</span>
            </CCol>
            <CCol sm={6}>
              <CFormInput
                id="sync-spend"
                name="spend"
                type="number"
                min={0}
                step="any"
                label="Inversión en pauta"
                placeholder="Ej. 450000"
                text="Lo que gastaste en anuncios en ese período."
              />
            </CCol>
            <CCol sm={6}>
              <CFormInput
                id="sync-product"
                name="product"
                label="Producto (opcional)"
                placeholder="ID, SKU o nombre"
                text="Para el CPA de un producto o campaña puntual."
              />
            </CCol>
            <CCol xs={12} className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <CFormSwitch id="sync-only-ads" name="onlyAds" label="Contar solo órdenes que vienen de un anuncio" />
              <CButton type="submit" color="primary" disabled={pending} className="d-inline-flex align-items-center gap-2">
                {pending ? <CSpinner size="sm" aria-hidden /> : <CIcon icon={cilCloudDownload} size="sm" />}
                Consultar órdenes
              </CButton>
            </CCol>
          </CRow>
        </CForm>

        {error && (
          <CAlert color="danger" className="small mt-4 mb-0">
            {error}
          </CAlert>
        )}

        {report && summary && (
          <div className={`sync-result ${pending ? "is-loading" : ""}`} aria-busy={pending}>
            {report.truncated && (
              <CAlert color="warning" className="small">
                El período tiene más órdenes de las que se consultan de una vez: acorta el rango para un cálculo exacto.
              </CAlert>
            )}

            <div className="sync-kpis">
              <Kpi
                label="Órdenes atribuidas"
                value={number.format(summary.attributedOrders)}
                hint={`${number.format(summary.totalOrders)} en el rango · ${number.format(summary.discardedOrders)} descartadas`}
              />
              <Kpi label="Ingresos" value={money(summary.revenue)} hint={`${number.format(summary.units)} unidades`} />
              <Kpi label="CPA real" value={money(summary.cpa)} hint={summary.spend ? `Inversión ${money(summary.spend)}` : "Ingresa la inversión"} />
              <Kpi label="ROAS" value={summary.roas === null ? "—" : `${summary.roas.toFixed(2)}×`} hint="Ingresos ÷ inversión" />
            </div>

            {lastQuery && (
              <p className="small text-body-secondary mt-3 mb-0">
                Consulta: <code className="sync-query">GET {lastQuery}</code>
              </p>
            )}

            <h3 className="h6 mt-4 mb-2">Productos</h3>
            {summary.byProduct.length === 0 ? (
              <p className="small text-body-secondary">Ninguna orden válida en el período con estos filtros.</p>
            ) : (
              <CTable className="table-admin" align="middle" small responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell scope="col">Producto</CTableHeaderCell>
                    <CTableHeaderCell scope="col" className="text-end">Órdenes</CTableHeaderCell>
                    <CTableHeaderCell scope="col" className="text-end">Unidades</CTableHeaderCell>
                    <CTableHeaderCell scope="col" className="text-end">Ingresos</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {summary.byProduct.slice(0, 8).map((product) => (
                    <CTableRow key={product.productId}>
                      <CTableDataCell>
                        <div className="text-body-emphasis">{product.name}</div>
                        <code className="small text-body-tertiary">{product.productId}</code>
                      </CTableDataCell>
                      <CTableDataCell className="text-end">{number.format(product.orders)}</CTableDataCell>
                      <CTableDataCell className="text-end">{number.format(product.units)}</CTableDataCell>
                      <CTableDataCell className="text-end">{money(product.revenue)}</CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            )}

            <h3 className="h6 mt-4 mb-2">Órdenes recientes</h3>
            {report.orders.length === 0 ? (
              <p className="small text-body-secondary mb-0">{provider.name} no devolvió órdenes en ese período.</p>
            ) : (
              <CTable className="table-admin" align="middle" small responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell scope="col">Orden</CTableHeaderCell>
                    <CTableHeaderCell scope="col">Cliente</CTableHeaderCell>
                    <CTableHeaderCell scope="col">Estado</CTableHeaderCell>
                    <CTableHeaderCell scope="col">Origen</CTableHeaderCell>
                    <CTableHeaderCell scope="col" className="text-end">Monto</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {report.orders.slice(0, 10).map((order) => (
                    <CTableRow key={order.id || order.code}>
                      <CTableDataCell>
                        <div className="fw-semibold text-body-emphasis">#{order.code}</div>
                        <div className="small text-body-secondary">
                          <LocalDate iso={order.date} />
                        </div>
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="text-body-emphasis">{order.customer || "—"}</div>
                        <div className="small text-body-secondary">{order.items.length} {order.items.length === 1 ? "producto" : "productos"}</div>
                      </CTableDataCell>
                      <CTableDataCell>
                        <CBadge className={STATUS_TONE[order.status]}>{order.status}</CBadge>
                        <div className="small text-body-tertiary">{order.statusName}</div>
                      </CTableDataCell>
                      <CTableDataCell className="small text-body-secondary">
                        {order.attribution.campaign ?? order.attribution.channel ?? "—"}
                        {order.attribution.adId && <div className="text-body-tertiary">Anuncio {order.attribution.adId}</div>}
                      </CTableDataCell>
                      <CTableDataCell className="text-end fw-semibold">{money(order.amount)}</CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            )}
          </div>
        )}
      </CCardBody>
    </CCard>
  );
}
