"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import {
  CAlert,
  CButton,
  CFormInput,
  CFormSelect,
  CFormSwitch,
  CNav,
  CNavItem,
  CNavLink,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilCloudDownload, cilReload, cilX } from "@coreui/icons";
import {
  applyFilters,
  byDimension,
  byProduct,
  byStatus,
  dailySeries,
  delta,
  metricValue,
  summarize,
  weekHourMatrix,
  type AnalyticsDataset,
  type AnalyticsOrder,
  type BoardFilters,
  type Metric,
} from "@/lib/integrations/analytics";
import type { OrderStatus } from "@/lib/orders";
import { dayRange } from "@/lib/integrations/timezone";
import { ChartCard, EmptyChart, Segmented } from "./chart-card";
import {
  compact,
  dateTimeIn,
  dayLabel,
  dayLabelLong,
  hourLabel,
  integer,
  money,
  moneyCompact,
  percent,
  rangeLabel,
  signedPercent,
  timeIn,
  WEEKDAYS_LONG,
} from "./format";
import { RankedBars } from "./ranked-bars";
import { StatTile } from "./stat-tile";
import { TrendChart } from "./trend-chart";
import { WeekHeatmap } from "./week-heatmap";

export type BoardIntegration = { id: string; name: string; externalId: string | null };

type Preset = "7d" | "30d" | "month" | "lastMonth" | "60d";
type RangeChoice = { kind: "preset"; preset: Preset } | { kind: "custom"; from: string; to: string };

const PRESETS: { id: Preset; label: string }[] = [
  { id: "7d", label: "7 días" },
  { id: "30d", label: "30 días" },
  { id: "month", label: "Este mes" },
  { id: "lastMonth", label: "Mes anterior" },
  { id: "60d", label: "60 días" },
];

const STATUS_TONE: Record<OrderStatus, string> = {
  Pagado: "bg-success-subtle text-success-emphasis",
  Enviado: "bg-info-subtle text-info-emphasis",
  Pendiente: "bg-warning-subtle text-warning-emphasis",
  Cancelado: "bg-secondary-subtle text-secondary-emphasis",
};

type Result = { data?: AnalyticsDataset; error?: string; status?: number };

/** Cifra de dinero: completa hasta 1 millón, compacta desde ahí ($22,3 M). */
const moneySmart = (value: number, currency: string) => (Math.abs(value) >= 1_000_000 ? moneyCompact(value, currency) : money(value, currency));

/** "1.234.567" o "1234567,50" → número. */
function parseAmount(text: string) {
  const digits = text.replace(/[^\d,]/g, "").replace(",", ".");
  const value = Number.parseFloat(digits);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function exportCsv(orders: AnalyticsOrder[], dataset: AnalyticsDataset) {
  const rows = [
    ["Pedido", "Fecha", "Estado", "Canal", "Campaña", "Productos", "Unidades", "Total"],
    ...orders.map((order) => [
      order.code,
      dateTimeIn(order.createdAt, dataset.shop.timezone),
      order.statusName,
      order.channel ?? "",
      order.campaign ?? "",
      order.items.map((item) => `${item.quantity} × ${item.name}`).join(" | "),
      String(order.items.reduce((sum, item) => sum + item.quantity, 0)),
      String(Math.round(order.amount)),
    ]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const link = Object.assign(document.createElement("a"), {
    href: url,
    download: `shopify-${dataset.shop.domain.split(".")[0]}-${dataset.range.from}_${dataset.range.to}.csv`,
  });
  link.click();
  URL.revokeObjectURL(url);
}

function queryFor(integrationId: string, range: RangeChoice, compare: boolean) {
  const params = new URLSearchParams({ integrationId, compare: compare ? "1" : "0" });
  if (range.kind === "preset") params.set("preset", range.preset);
  else {
    params.set("from", range.from);
    params.set("to", range.to);
  }
  return params.toString();
}

export function ShopifyBoard({ integrations }: { integrations: BoardIntegration[] }) {
  const [integrationId, setIntegrationId] = useState(integrations[0].id);
  const [range, setRange] = useState<RangeChoice>({ kind: "preset", preset: "30d" });
  const [compare, setCompare] = useState(true);
  const [customOpen, setCustomOpen] = useState(false);
  const [spendText, setSpendText] = useState("");
  const [filters, setFilters] = useState<BoardFilters>({ product: null, status: null });
  const [metric, setMetric] = useState<Metric>("revenue");
  const [productMetric, setProductMetric] = useState<"revenue" | "units">("revenue");
  const [originTab, setOriginTab] = useState<"channel" | "campaign">("channel");
  const [ordersShown, setOrdersShown] = useState(8);

  // Respuestas por consulta: volver a un período ya cargado es instantáneo.
  const [results, setResults] = useState<Map<string, Result>>(() => new Map());
  const [displayKey, setDisplayKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const key = queryFor(integrationId, range, compare);
  const loading = !results.has(key);

  useEffect(() => {
    if (results.has(key)) return;
    const controller = new AbortController();
    fetch(`/api/shopify/analytics?${key}`, { headers: { Accept: "application/json" }, signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        const result: Result = response.ok ? { data: body as AnalyticsDataset } : { error: body?.error ?? `HTTP ${response.status}`, status: response.status };
        setResults((current) => new Map(current).set(key, result));
        if (result.data) setDisplayKey(key);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResults((current) => new Map(current).set(key, { error: error instanceof Error ? error.message : "No se pudo contactar al servidor." }));
      });
    return () => controller.abort();
  }, [key, results]);

  function reload() {
    setResults((current) => {
      const next = new Map(current);
      next.delete(key);
      return next;
    });
  }

  const dataset = displayKey ? results.get(displayKey)?.data ?? null : null;
  const failure = results.get(key)?.error ? results.get(key) : null;
  const spend = parseAmount(spendText);

  // --------------------------------------------------------------- Cálculos
  const view = useMemo(() => {
    if (!dataset) return null;
    const currency = dataset.shop.currency;
    const current = dataset.orders.filter((order) => order.period === "current");
    const previous = dataset.previous ? dataset.orders.filter((order) => order.period === "previous") : null;

    const filtered = applyFilters(current, filters);
    const filteredPrev = previous ? applyFilters(previous, filters) : null;
    const summary = summarize(filtered, filters.product);
    const prevSummary = filteredPrev ? summarize(filteredPrev, filters.product) : null;

    const days = dayRange(dataset.range.from, dataset.range.to);
    const series = dailySeries(filtered, dataset.range.from, dataset.range.to, filters.product);
    const prevSeries = dataset.previous && filteredPrev ? dailySeries(filteredPrev, dataset.previous.from, dataset.previous.to, filters.product) : null;
    const cancelledByDay = days.map((day) => filtered.filter((order) => order.day === day && !order.sale).length);

    // Filtro cruzado: cada desglose aplica los demás filtros, no el suyo, para poder cambiar la selección.
    const products = byProduct(applyFilters(current, { ...filters, product: null }), productMetric);
    const statuses = byStatus(applyFilters(current, { ...filters, status: null }), filters.product);
    const channels = byDimension(filtered, (order) => order.channel, filters.product);
    const campaigns = byDimension(filtered, (order) => order.campaign, filters.product);
    const heat = weekHourMatrix(filtered);
    const recent = [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const productName = filters.product ? products.find((item) => item.key === filters.product)?.label ?? current.flatMap((order) => order.items).find((item) => item.productId === filters.product)?.name ?? "Producto" : null;

    return { currency, current, filtered, summary, prevSummary, days, series, prevSeries, cancelledByDay, products, statuses, channels, campaigns, heat, recent, productName };
  }, [dataset, filters, productMetric]);

  // --------------------------------------------------------------- Estados sin datos
  if (!dataset) {
    if (failure) {
      return (
        <CAlert color="danger" className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <span>
            <strong>No se pudieron cargar los datos de Shopify.</strong> {failure.error}
          </span>
          <span className="d-flex gap-2">
            {failure.status === 404 || failure.status === 502 ? (
              <Link href="/dashboard/integraciones/shopify" className="btn btn-sm btn-outline-danger">
                Revisar la conexión
              </Link>
            ) : null}
            <CButton size="sm" color="danger" onClick={reload}>
              Reintentar
            </CButton>
          </span>
        </CAlert>
      );
    }
    return <BoardSkeleton />;
  }

  const v = view!;
  const vs = dataset.previous ? rangeLabel(dataset.previous) : "";
  const tileDelta = (current: number | null, previous: number | null | undefined, upIsGood = true) => {
    if (!dataset.previous || previous === undefined) return null;
    const change = delta(current, previous);
    if (change === null) return null;
    const direction = Math.abs(change) < 0.0005 ? "flat" : change > 0 ? "up" : "down";
    return { text: signedPercent(change), direction, good: direction === "flat" ? null : (change > 0) === upIsGood, vs } as const;
  };
  const cancelDelta = (() => {
    if (!v.prevSummary || v.summary.cancelRate === null || v.prevSummary.cancelRate === null) return null;
    const points = (v.summary.cancelRate - v.prevSummary.cancelRate) * 100;
    const direction = Math.abs(points) < 0.05 ? "flat" : points > 0 ? "up" : "down";
    const text = `${points > 0 ? "+" : points < 0 ? "−" : ""}${Math.abs(points).toLocaleString("es-CO", { maximumFractionDigits: 1 })} pp`;
    return { text, direction, good: direction === "flat" ? null : points < 0, vs } as const;
  })();

  const metricFormat = (value: number) => (metric === "orders" ? integer(value) : moneySmart(value, v.currency));
  const metricAxis = (value: number) => (metric === "orders" ? compact(value) : moneyCompact(value, v.currency));
  const metricLabel = metric === "revenue" ? "Ventas" : metric === "orders" ? "Pedidos" : "Ticket promedio";
  const trendCurrent = v.series.map((point) => metricValue(point, metric));
  const trendPrevious = v.prevSeries && dataset.previous ? { days: dayRange(dataset.previous.from, dataset.previous.to), values: v.prevSeries.map((point) => metricValue(point, metric)) } : null;
  const hasFilters = Boolean(filters.product || filters.status);
  const orderUrl = (order: AnalyticsOrder) => dataset.orderUrlTemplate?.replace("{id}", encodeURIComponent(order.id)) ?? null;

  return (
    <div className={`analytics-board ${loading ? "is-loading" : ""}`} aria-busy={loading}>
      {/* ----------------------------------------------------------- Filtros */}
      <div className="board-filters" role="search" aria-label="Filtros del tablero">
        {integrations.length > 1 && (
          <CFormSelect size="sm" className="board-filters__store" aria-label="Tienda" value={integrationId} onChange={(event) => setIntegrationId(event.target.value)}>
            {integrations.map((integration) => (
              <option key={integration.id} value={integration.id}>
                {integration.name}
              </option>
            ))}
          </CFormSelect>
        )}
        <CNav variant="enclosed-pills" role="group" aria-label="Período" className="board-filters__range">
          {PRESETS.map((preset) => {
            const active = range.kind === "preset" && range.preset === preset.id;
            return (
              <CNavItem key={preset.id}>
                <CNavLink
                  as="button"
                  type="button"
                  active={active}
                  aria-pressed={active}
                  onClick={() => {
                    setCustomOpen(false);
                    startTransition(() => setRange({ kind: "preset", preset: preset.id }));
                  }}
                >
                  {preset.label}
                </CNavLink>
              </CNavItem>
            );
          })}
          <CNavItem>
            <CNavLink as="button" type="button" active={range.kind === "custom" || customOpen} aria-expanded={customOpen} onClick={() => setCustomOpen((open) => !open)}>
              Personalizado
            </CNavLink>
          </CNavItem>
        </CNav>
        <CFormSwitch id="board-compare" label="Comparar con el período anterior" checked={compare} onChange={(event) => setCompare(event.target.checked)} />
        <div className="board-filters__spend">
          <label htmlFor="board-spend" className="visually-hidden">
            Inversión en pauta del período
          </label>
          <span className="board-filters__prefix" aria-hidden="true">
            $
          </span>
          <CFormInput
            id="board-spend"
            size="sm"
            inputMode="numeric"
            placeholder="Inversión en pauta"
            value={spendText}
            onChange={(event) => setSpendText(event.target.value)}
            title="Lo que invertiste en anuncios en el período: calcula el CPA y el ROAS"
          />
        </div>
      </div>

      {customOpen && <CustomRange initial={dataset.range} onApply={(from, to) => setRange({ kind: "custom", from, to })} />}

      <div className="board-context">
        <div className="board-context__info">
          <span>
            <strong>{dataset.shop.name}</strong>
            {dataset.shop.primaryDomain ? ` · ${dataset.shop.primaryDomain}` : ""} · {rangeLabel(dataset.range)}
            {dataset.previous ? ` vs. ${rangeLabel(dataset.previous)}` : ""}
          </span>
          <span className="text-body-tertiary">Actualizado {timeIn(dataset.fetchedAt, dataset.shop.timezone)} (horario de la tienda)</span>
        </div>
        <div className="board-context__actions">
          <CButton size="sm" color="secondary" variant="ghost" onClick={reload} disabled={loading} title="Volver a consultar a Shopify">
            {loading ? <CSpinner size="sm" aria-hidden /> : <CIcon icon={cilReload} size="sm" />}
            <span className="ms-1">Actualizar</span>
          </CButton>
          <CButton size="sm" color="secondary" variant="outline" onClick={() => exportCsv(v.recent, dataset)} disabled={v.recent.length === 0}>
            <CIcon icon={cilCloudDownload} size="sm" />
            <span className="ms-1">Exportar CSV</span>
          </CButton>
        </div>
      </div>

      {hasFilters && (
        <div className="board-chips" aria-label="Filtros activos">
          {filters.product && (
            <button type="button" className="board-chip" onClick={() => setFilters((current) => ({ ...current, product: null }))}>
              Producto: {v.productName} <CIcon icon={cilX} size="sm" aria-label="Quitar" />
            </button>
          )}
          {filters.status && (
            <button type="button" className="board-chip" onClick={() => setFilters((current) => ({ ...current, status: null }))}>
              Estado: {filters.status} <CIcon icon={cilX} size="sm" aria-label="Quitar" />
            </button>
          )}
          <button type="button" className="board-chip board-chip--clear" onClick={() => setFilters({ product: null, status: null })}>
            Limpiar filtros
          </button>
        </div>
      )}

      {dataset.notices.map((notice) => (
        <CAlert key={notice} color="warning" className="small py-2">
          {notice}
        </CAlert>
      ))}
      {failure && (
        <CAlert color="danger" className="small py-2 d-flex align-items-center justify-content-between gap-2">
          <span>No se pudo actualizar: {failure.error}. Se muestran los últimos datos cargados.</span>
          <CButton size="sm" color="danger" variant="ghost" onClick={reload}>
            Reintentar
          </CButton>
        </CAlert>
      )}

      {/* ----------------------------------------------------------- KPIs */}
      <div className="board-kpis">
        <StatTile
          label="Ventas"
          value={moneySmart(v.summary.revenue, v.currency)}
          delta={tileDelta(v.summary.revenue, v.prevSummary?.revenue)}
          hint={`${integer(v.summary.units)} unidades`}
          trend={v.series.map((point) => point.revenue)}
        />
        <StatTile
          label="Pedidos"
          value={integer(v.summary.orders)}
          delta={tileDelta(v.summary.orders, v.prevSummary?.orders)}
          hint={`${integer(v.summary.units)} unidades`}
          trend={v.series.map((point) => point.orders)}
        />
        <StatTile
          label="Ticket promedio"
          value={v.summary.aov === null ? "—" : money(v.summary.aov, v.currency)}
          delta={tileDelta(v.summary.aov, v.prevSummary?.aov)}
          hint="Ventas ÷ pedidos"
          trend={v.series.map((point) => metricValue(point, "aov"))}
        />
        <StatTile
          label="Cancelados"
          value={v.summary.cancelRate === null ? "—" : percent(v.summary.cancelRate)}
          delta={cancelDelta}
          hint={`${integer(v.summary.cancelled)} de ${integer(v.summary.total)} pedidos`}
          trend={v.cancelledByDay}
          trendLabel="Pedidos cancelados por día"
        />
        {spend !== null && (
          <>
            <StatTile
              label="CPA real"
              value={v.summary.orders > 0 ? money(spend / v.summary.orders, v.currency) : "—"}
              hint={`${moneySmart(spend, v.currency)} ÷ ${integer(v.summary.orders)} pedidos`}
            />
            <StatTile label="ROAS" value={`${(v.summary.revenue / spend).toLocaleString("es-CO", { maximumFractionDigits: 2 })}×`} hint="Ventas ÷ inversión" />
          </>
        )}
      </div>

      {/* ----------------------------------------------------------- Gráficas */}
      <div className="board-grid">
        <div className="board-grid__wide">
          <ChartCard
            title={`${metricLabel} por día`}
            subtitle={dataset.previous ? `${rangeLabel(dataset.range)} frente a ${rangeLabel(dataset.previous)}` : rangeLabel(dataset.range)}
            actions={
              <Segmented
                label="Métrica"
                value={metric}
                onChange={setMetric}
                options={[
                  { value: "revenue", label: "Ventas" },
                  { value: "orders", label: "Pedidos" },
                  { value: "aov", label: "Ticket" },
                ]}
              />
            }
            table={
              <table className="table table-sm viz-table">
                <thead>
                  <tr>
                    <th scope="col">Día</th>
                    <th scope="col" className="text-end">
                      {metricLabel}
                    </th>
                    {trendPrevious && (
                      <th scope="col" className="text-end">
                        Período anterior
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {v.days.map((day, index) => (
                    <tr key={day}>
                      <td>{dayLabelLong(day)}</td>
                      <td className="text-end">{trendCurrent[index] === null ? "—" : metricFormat(trendCurrent[index]!)}</td>
                      {trendPrevious && (
                        <td className="text-end text-body-secondary">
                          {trendPrevious.values[index] == null ? "—" : metricFormat(trendPrevious.values[index]!)}{" "}
                          <span className="small">({dayLabel(trendPrevious.days[index])})</span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          >
            {v.summary.orders === 0 ? (
              <EmptyChart>Sin ventas en este período con los filtros actuales.</EmptyChart>
            ) : (
              <TrendChart
                days={v.days}
                current={trendCurrent}
                previous={trendPrevious}
                format={metricFormat}
                formatAxis={metricAxis}
                label={`${metricLabel} por día, ${rangeLabel(dataset.range)}`}
              />
            )}
          </ChartCard>
        </div>

        <div className="board-grid__side">
          <ChartCard
            title="Estado de los pedidos"
            subtitle="Toca un estado para filtrar el tablero"
            table={
              <BreakdownTable
                head="Estado"
                rows={v.statuses.map((item) => ({ label: item.label, orders: item.orders, revenue: item.revenue }))}
                currency={v.currency}
                total={v.statuses.reduce((sum, item) => sum + item.orders, 0)}
              />
            }
          >
            {v.statuses.length === 0 ? (
              <EmptyChart>Sin pedidos en el período.</EmptyChart>
            ) : (
              <RankedBars
                label="Pedidos por estado"
                keepOrder
                selected={filters.status}
                onSelect={(status) => setFilters((current) => ({ ...current, status: status as OrderStatus | null }))}
                items={(() => {
                  const total = v.statuses.reduce((sum, item) => sum + item.orders, 0) || 1;
                  return v.statuses.map((item) => ({
                    key: item.key,
                    label: item.label,
                    value: item.orders,
                    display: integer(item.orders),
                    detail: `${percent(item.orders / total)} · ${moneySmart(item.revenue, v.currency)}`,
                  }));
                })()}
              />
            )}
            {(() => {
              const pending = v.statuses.find((item) => item.key === "Pendiente");
              return pending ? (
                <p className="board-note">
                  <strong>{integer(pending.orders)}</strong> {pending.orders === 1 ? "pedido sigue" : "pedidos siguen"} sin enviar ·{" "}
                  {moneySmart(pending.revenue, v.currency)} por despachar.
                </p>
              ) : null;
            })()}
          </ChartCard>
        </div>

        <div className="board-grid__half">
          <ChartCard
            title="Productos más vendidos"
            subtitle="Toca un producto para ver su desempeño en todo el tablero"
            actions={
              <Segmented
                label="Ordenar productos por"
                value={productMetric}
                onChange={setProductMetric}
                options={[
                  { value: "revenue", label: "Ventas" },
                  { value: "units", label: "Unidades" },
                ]}
              />
            }
            table={
              <table className="table table-sm viz-table">
                <thead>
                  <tr>
                    <th scope="col">Producto</th>
                    <th scope="col" className="text-end">
                      Pedidos
                    </th>
                    <th scope="col" className="text-end">
                      Unidades
                    </th>
                    <th scope="col" className="text-end">
                      Ventas
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {v.products.map((item) => (
                    <tr key={item.key}>
                      <td>{item.label}</td>
                      <td className="text-end">{integer(item.orders)}</td>
                      <td className="text-end">{integer(item.units)}</td>
                      <td className="text-end">{money(item.revenue, v.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          >
            {v.products.length === 0 ? (
              <EmptyChart>Sin productos vendidos con los filtros actuales.</EmptyChart>
            ) : (
              <RankedBars
                label="Productos por ventas"
                layout="stacked"
                selected={filters.product}
                onSelect={(product) => setFilters((current) => ({ ...current, product }))}
                items={v.products.map((item) => ({
                  key: item.key,
                  label: item.label,
                  value: productMetric === "revenue" ? item.revenue : item.units,
                  display: productMetric === "revenue" ? moneySmart(item.revenue, v.currency) : `${integer(item.units)} u.`,
                  detail: `${integer(item.orders)} ${item.orders === 1 ? "pedido" : "pedidos"}`,
                }))}
              />
            )}
          </ChartCard>
        </div>

        <div className="board-grid__half board-grid__stack">
          <ChartCard
            title="¿Cuándo compran?"
            subtitle="Pedidos por día de la semana y hora"
            table={
              <table className="table table-sm viz-table">
                <thead>
                  <tr>
                    <th scope="col">Día</th>
                    <th scope="col">Hora pico</th>
                    <th scope="col" className="text-end">
                      Pedidos del día
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5, 6, 0].map((weekday) => {
                    const row = v.heat[weekday];
                    const total = row.reduce((sum, value) => sum + value, 0);
                    const peak = row.indexOf(Math.max(...row));
                    return (
                      <tr key={weekday}>
                        <td className="text-capitalize">{WEEKDAYS_LONG[weekday]}</td>
                        <td>{total > 0 ? `${hourLabel(peak)} (${integer(row[peak])})` : "—"}</td>
                        <td className="text-end">{integer(total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            }
          >
            <WeekHeatmap matrix={v.heat} timezone={dataset.shop.timezone} />
          </ChartCard>

          <ChartCard
            title="Origen de las ventas"
            subtitle={originTab === "channel" ? "App o canal que creó el pedido" : "Campaña UTM de la visita"}
            actions={
              <Segmented
                label="Origen"
                value={originTab}
                onChange={setOriginTab}
                options={[
                  { value: "channel", label: "Canal" },
                  { value: "campaign", label: "Campaña" },
                ]}
              />
            }
            table={
              <BreakdownTable
                head={originTab === "channel" ? "Canal" : "Campaña"}
                rows={(originTab === "channel" ? v.channels : v.campaigns).map((item) => ({ label: item.label, orders: item.orders, revenue: item.revenue }))}
                currency={v.currency}
                total={v.summary.orders}
              />
            }
          >
            <OriginView tab={originTab} channels={v.channels} campaigns={v.campaigns} totalOrders={v.summary.orders} currency={v.currency} />
          </ChartCard>
        </div>

        <div className="board-grid__full">
          <ChartCard
            title="Pedidos del período"
            subtitle={`${integer(v.recent.length)} pedidos${v.summary.cancelled ? ` (${integer(v.summary.cancelled)} ${v.summary.cancelled === 1 ? "cancelado" : "cancelados"})` : ""} · los más recientes primero`}
          >
            {v.recent.length === 0 ? (
              <EmptyChart>Sin pedidos con los filtros actuales.</EmptyChart>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="table table-admin table-hover align-middle viz-orders">
                    <thead>
                      <tr>
                        <th scope="col">Pedido</th>
                        <th scope="col">Fecha</th>
                        <th scope="col">Productos</th>
                        <th scope="col">Estado</th>
                        <th scope="col" className="text-end">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {v.recent.slice(0, ordersShown).map((order) => {
                        const url = orderUrl(order);
                        const products = order.items.map((item) => `${item.quantity} × ${item.name}`).join(", ");
                        return (
                          <tr key={order.id}>
                            <td className="text-nowrap fw-semibold">
                              {url ? (
                                <a href={url} target="_blank" rel="noreferrer" title="Abrir en Shopify">
                                  #{order.code}
                                </a>
                              ) : (
                                `#${order.code}`
                              )}
                            </td>
                            <td className="text-nowrap small text-body-secondary">{dateTimeIn(order.createdAt, dataset.shop.timezone)}</td>
                            <td title={products}>
                              <div className="viz-orders__products">{products}</div>
                            </td>
                            <td>
                              <span className={`badge ${STATUS_TONE[order.status]}`}>{order.status}</span>
                              <div className="small text-body-tertiary">{order.statusName}</div>
                            </td>
                            <td className="text-end fw-semibold text-nowrap">{money(order.amount, v.currency)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {v.recent.length > ordersShown && (
                  <div className="text-center mt-2">
                    <CButton size="sm" color="secondary" variant="ghost" onClick={() => setOrdersShown((count) => count + 20)}>
                      Ver más ({integer(v.recent.length - ordersShown)} restantes)
                    </CButton>
                  </div>
                )}
              </>
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- Piezas

function CustomRange({ initial, onApply }: { initial: { from: string; to: string }; onApply: (from: string, to: string) => void }) {
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const invalid = !from || !to || from > to;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invalid) onApply(from, to);
  }

  return (
    <form className="board-custom" onSubmit={submit}>
      <CFormInput id="board-from" type="date" size="sm" label="Desde" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} />
      <CFormInput id="board-to" type="date" size="sm" label="Hasta" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} />
      <CButton type="submit" size="sm" color="primary" disabled={invalid}>
        Aplicar
      </CButton>
      <span className="small text-body-tertiary">Hasta 93 días, en el horario de la tienda.</span>
    </form>
  );
}

function BreakdownTable({ head, rows, currency, total }: { head: string; rows: { label: string; orders: number; revenue: number }[]; currency: string; total: number }) {
  return (
    <table className="table table-sm viz-table">
      <thead>
        <tr>
          <th scope="col">{head}</th>
          <th scope="col" className="text-end">
            Pedidos
          </th>
          <th scope="col" className="text-end">
            %
          </th>
          <th scope="col" className="text-end">
            Ventas
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td colSpan={4} className="text-body-secondary">
              Sin datos.
            </td>
          </tr>
        )}
        {rows.map((row) => (
          <tr key={row.label}>
            <td>{row.label}</td>
            <td className="text-end">{integer(row.orders)}</td>
            <td className="text-end">{total > 0 ? percent(row.orders / total) : "—"}</td>
            <td className="text-end">{money(row.revenue, currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OriginView({
  tab,
  channels,
  campaigns,
  totalOrders,
  currency,
}: {
  tab: "channel" | "campaign";
  channels: ReturnType<typeof byDimension>;
  campaigns: ReturnType<typeof byDimension>;
  totalOrders: number;
  currency: string;
}) {
  const items = tab === "channel" ? channels : campaigns;

  if (tab === "campaign" && items.length === 0) {
    return (
      <EmptyChart>
        <strong className="d-block mb-1">Ningún pedido trae una campaña UTM.</strong>
        Agrega <code>?utm_source=facebook&amp;utm_campaign=nombre</code> a los enlaces de tus anuncios y aquí verás qué campaña vende más; así
        también puedes calcular el CPA por campaña.
      </EmptyChart>
    );
  }
  if (items.length === 0) return <EmptyChart>Sin ventas en el período.</EmptyChart>;
  if (items.length === 1) {
    // Una sola categoría: una barra no dice nada; se muestra como cifra.
    return (
      <div className="origin-single">
        <span className="origin-single__value">100 %</span>
        <span className="origin-single__label">
          de los pedidos llegaron por <strong>{items[0].label}</strong>
        </span>
        <span className="small text-body-secondary">
          {integer(items[0].orders)} pedidos · {moneySmart(items[0].revenue, currency)}
        </span>
      </div>
    );
  }
  return (
    <RankedBars
      label={tab === "channel" ? "Ventas por canal" : "Ventas por campaña"}
      items={items.map((item) => ({
        key: item.key,
        label: item.label,
        value: item.revenue,
        display: moneySmart(item.revenue, currency),
        detail: `${integer(item.orders)} pedidos · ${totalOrders > 0 ? percent(item.orders / totalOrders) : "—"}`,
      }))}
    />
  );
}

function BoardSkeleton() {
  return (
    <div className="placeholder-glow" aria-busy="true" aria-label="Cargando datos de Shopify…">
      <div className="d-flex flex-wrap gap-2 mb-4">
        <span className="placeholder rounded-pill col-5" style={{ height: "2.25rem" }} />
        <span className="placeholder rounded-pill col-3" style={{ height: "2.25rem" }} />
      </div>
      <div className="board-kpis mb-4">
        {Array.from({ length: 4 }, (_, index) => (
          <span key={index} className="placeholder rounded-3" style={{ height: "7rem" }} />
        ))}
      </div>
      <span className="placeholder rounded-3 w-100 d-block" style={{ height: "20rem" }} />
      <p className="small text-body-secondary mt-3">Consultando los pedidos en Shopify…</p>
    </div>
  );
}
