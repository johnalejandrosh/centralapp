/**
 * Cruce de órdenes con la inversión en pauta. Funciones puras (sin servidor ni red):
 * las usa la Route Handler de Pancake y se pueden reutilizar en un simulador del cliente.
 *
 *   CPA  = inversión ÷ órdenes atribuidas
 *   ROAS = ingresos de esas órdenes ÷ inversión
 */
import type { AppOrder } from "@/lib/orders";

export type OrderFilters = {
  /** Solo órdenes que incluyan este producto (ID exacto o parte del nombre / SKU). */
  product?: string | null;
  /** Solo órdenes que traen un anuncio o campaña asociada. */
  onlyAds?: boolean;
};

export type ProductSummary = {
  productId: string;
  name: string;
  orders: number;
  units: number;
  revenue: number;
};

export type SalesSummary = {
  /** Órdenes del rango, antes de filtros. */
  totalOrders: number;
  /** Canceladas, eliminadas o devueltas dentro del rango. */
  discardedOrders: number;
  /** Órdenes válidas que cumplen los filtros: el divisor del CPA. */
  attributedOrders: number;
  units: number;
  revenue: number;
  spend: number | null;
  cpa: number | null;
  roas: number | null;
  byProduct: ProductSummary[];
};

function matchesProduct(order: AppOrder, needle: string) {
  return order.items.some(
    (item) =>
      item.productId === needle ||
      item.variationId === needle ||
      item.name.toLowerCase().includes(needle) ||
      Boolean(item.sku && item.sku.toLowerCase() === needle),
  );
}

export function filterAttributedOrders(orders: AppOrder[], filters: OrderFilters = {}): AppOrder[] {
  const needle = filters.product?.trim().toLowerCase();
  return orders.filter(
    (order) =>
      order.countsAsSale &&
      (!filters.onlyAds || Boolean(order.attribution.adId || order.attribution.campaign)) &&
      (!needle || matchesProduct(order, needle)),
  );
}

export function summarizeSales(orders: AppOrder[], spend: number | null, filters: OrderFilters = {}): SalesSummary {
  const attributed = filterAttributedOrders(orders, filters);
  const revenue = attributed.reduce((sum, order) => sum + order.amount, 0);
  const units = attributed.reduce((sum, order) => sum + order.items.reduce((acc, item) => acc + item.quantity, 0), 0);

  const products = new Map<string, ProductSummary>();
  for (const order of attributed) {
    const seen = new Set<string>();
    for (const item of order.items) {
      const entry = products.get(item.productId) ?? { productId: item.productId, name: item.name, orders: 0, units: 0, revenue: 0 };
      entry.units += item.quantity;
      entry.revenue += item.revenue;
      if (!seen.has(item.productId)) {
        entry.orders += 1;
        seen.add(item.productId);
      }
      products.set(item.productId, entry);
    }
  }

  const investment = spend !== null && spend > 0 ? spend : null;
  return {
    totalOrders: orders.length,
    discardedOrders: orders.filter((order) => !order.countsAsSale).length,
    attributedOrders: attributed.length,
    units,
    revenue,
    spend,
    cpa: investment !== null && attributed.length > 0 ? investment / attributed.length : null,
    roas: investment !== null ? revenue / investment : null,
    byProduct: [...products.values()].sort((a, b) => b.orders - a.orders || b.revenue - a.revenue),
  };
}

/** Respuesta de GET /api/pancake/orders (y de futuras integraciones de ventas). */
export type OrdersReport = {
  integration: { id: string; name: string; shopId: string };
  range: { from: string; to: string };
  filters: { product: string | null; onlyAds: boolean };
  /** `true` si el rango tenía más órdenes de las que se consultan de una vez. */
  truncated: boolean;
  summary: SalesSummary;
  /** Las órdenes más recientes del rango (hasta `limit`). */
  orders: AppOrder[];
};
