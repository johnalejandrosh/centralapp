/**
 * Analítica de ventas para los tableros. Funciones puras (sin red ni servidor): el tablero
 * recibe las órdenes del período una sola vez y recalcula todo en el navegador al filtrar,
 * así los filtros responden al instante.
 */
import type { OrderStatus } from "@/lib/orders";
import { dayRange } from "./timezone";

/** Orden compacta para analítica (sin datos personales del cliente). */
export type AnalyticsOrder = {
  id: string;
  code: string;
  period: "current" | "previous";
  /** Fecha y hora en la zona horaria de la tienda. */
  day: string;
  weekday: number;
  hour: number;
  createdAt: string;
  amount: number;
  /** `false` en canceladas, reembolsadas o anuladas. */
  sale: boolean;
  status: OrderStatus;
  statusName: string;
  channel: string | null;
  campaign: string | null;
  items: { productId: string; name: string; sku: string | null; quantity: number; revenue: number }[];
};

/** Respuesta de GET /api/shopify/analytics. */
export type AnalyticsDataset = {
  shop: { name: string; domain: string; primaryDomain: string | null; currency: string; timezone: string };
  /** Plantilla del enlace a cada pedido en el admin de Shopify (`{id}` se reemplaza). */
  orderUrlTemplate: string | null;
  range: { from: string; to: string };
  /** Período anterior de la misma duración; `null` si no se pidió o no hay datos para compararlo. */
  previous: { from: string; to: string } | null;
  /** Avisos para el usuario (historial limitado, comparación no disponible, datos truncados). */
  notices: string[];
  fetchedAt: string;
  orders: AnalyticsOrder[];
};

export type BoardFilters = { product: string | null; status: OrderStatus | null };

export type Metric = "revenue" | "orders" | "aov";

// ----------------------------------------------------------------- Filtros

/** Ventas de una orden según el filtro de producto (solo la parte de ese producto). */
export function orderRevenue(order: AnalyticsOrder, product: string | null) {
  if (!product) return order.amount;
  return order.items.filter((item) => item.productId === product).reduce((sum, item) => sum + item.revenue, 0);
}

export function orderUnits(order: AnalyticsOrder, product: string | null) {
  return order.items.filter((item) => !product || item.productId === product).reduce((sum, item) => sum + item.quantity, 0);
}

export function applyFilters(orders: AnalyticsOrder[], filters: BoardFilters) {
  return orders.filter(
    (order) =>
      (!filters.product || order.items.some((item) => item.productId === filters.product)) &&
      (!filters.status || order.status === filters.status),
  );
}

// ----------------------------------------------------------------- KPIs

export type Summary = {
  revenue: number;
  orders: number;
  aov: number | null;
  units: number;
  /** Canceladas / reembolsadas sobre el total de órdenes. */
  cancelled: number;
  cancelRate: number | null;
  total: number;
};

export function summarize(orders: AnalyticsOrder[], product: string | null): Summary {
  const sales = orders.filter((order) => order.sale);
  const revenue = sales.reduce((sum, order) => sum + orderRevenue(order, product), 0);
  const cancelled = orders.length - sales.length;
  return {
    revenue,
    orders: sales.length,
    aov: sales.length > 0 ? revenue / sales.length : null,
    units: sales.reduce((sum, order) => sum + orderUnits(order, product), 0),
    cancelled,
    cancelRate: orders.length > 0 ? cancelled / orders.length : null,
    total: orders.length,
  };
}

/** Variación relativa; `null` si no hay base para comparar. */
export function delta(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

// ----------------------------------------------------------------- Series de tiempo

export type DailyPoint = { day: string; revenue: number; orders: number };

export function dailySeries(orders: AnalyticsOrder[], from: string, to: string, product: string | null): DailyPoint[] {
  const points = new Map(dayRange(from, to).map((day) => [day, { day, revenue: 0, orders: 0 }]));
  for (const order of orders) {
    const point = points.get(order.day);
    if (!point || !order.sale) continue;
    point.revenue += orderRevenue(order, product);
    point.orders += 1;
  }
  return [...points.values()];
}

export function metricValue(point: DailyPoint, metric: Metric) {
  if (metric === "revenue") return point.revenue;
  if (metric === "orders") return point.orders;
  return point.orders > 0 ? point.revenue / point.orders : null;
}

// ----------------------------------------------------------------- Desgloses

export type Breakdown = { key: string; label: string; orders: number; units: number; revenue: number };

function rank(map: Map<string, Breakdown>, by: "revenue" | "orders" | "units") {
  return [...map.values()].sort((a, b) => b[by] - a[by] || b.orders - a.orders || a.label.localeCompare(b.label));
}

export function byProduct(orders: AnalyticsOrder[], by: "revenue" | "units" = "revenue"): Breakdown[] {
  const map = new Map<string, Breakdown>();
  for (const order of orders) {
    if (!order.sale) continue;
    const seen = new Set<string>();
    for (const item of order.items) {
      const entry = map.get(item.productId) ?? { key: item.productId, label: item.name, orders: 0, units: 0, revenue: 0 };
      entry.units += item.quantity;
      entry.revenue += item.revenue;
      if (!seen.has(item.productId)) entry.orders += 1;
      seen.add(item.productId);
      map.set(item.productId, entry);
    }
  }
  return rank(map, by);
}

const STATUS_ORDER: OrderStatus[] = ["Pendiente", "Enviado", "Pagado", "Cancelado"];

/** Todas las órdenes (incluidas canceladas) por estado, en un orden fijo. */
export function byStatus(orders: AnalyticsOrder[], product: string | null): Breakdown[] {
  return STATUS_ORDER.map((status) => {
    const group = orders.filter((order) => order.status === status);
    return {
      key: status,
      label: status,
      orders: group.length,
      units: group.reduce((sum, order) => sum + orderUnits(order, product), 0),
      revenue: group.reduce((sum, order) => sum + orderRevenue(order, product), 0),
    };
  }).filter((entry) => entry.orders > 0);
}

export function byDimension(orders: AnalyticsOrder[], pick: (order: AnalyticsOrder) => string | null, product: string | null) {
  const map = new Map<string, Breakdown>();
  for (const order of orders) {
    if (!order.sale) continue;
    const label = pick(order);
    if (!label) continue;
    const entry = map.get(label) ?? { key: label, label, orders: 0, units: 0, revenue: 0 };
    entry.orders += 1;
    entry.units += orderUnits(order, product);
    entry.revenue += orderRevenue(order, product);
    map.set(label, entry);
  }
  return rank(map, "revenue");
}

// ----------------------------------------------------------------- Mapa de calor

/** Pedidos válidos por día de la semana (0 = domingo) y hora (0–23), en la zona de la tienda. */
export function weekHourMatrix(orders: AnalyticsOrder[]) {
  const matrix = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  for (const order of orders) if (order.sale) matrix[order.weekday][order.hour] += 1;
  return matrix;
}
