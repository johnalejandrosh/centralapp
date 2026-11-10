/**
 * Datos del tablero analítico de Shopify: resuelve el rango en la zona horaria de la tienda,
 * trae los pedidos del período (y del anterior, para comparar) y los compacta para el navegador.
 */
import "server-only";
import type { AnalyticsDataset, AnalyticsOrder } from "@/lib/integrations/analytics";
import { addDays, dayCount, isDay, localDay, startOfDay, zonedParts } from "@/lib/integrations/timezone";
import type { ShopifyConnection } from "./shopify";
import { fetchShopifyOrders, getShopifyShopInfo, ShopifyError } from "./shopify";

export const RANGE_PRESETS = ["7d", "30d", "60d", "90d", "month", "lastMonth"] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

const MAX_DAYS = 93;
/** Sin el permiso read_all_orders, Shopify solo entrega pedidos de los últimos 60 días. */
const DEFAULT_HISTORY_DAYS = 60;

export type AnalyticsRequest = { preset?: RangePreset; from?: string; to?: string; compare: boolean };

/** Rango de días (ambos incluidos) en la zona horaria de la tienda. */
function resolveRange(request: AnalyticsRequest, today: string): { from: string; to: string } {
  if (request.from && request.to) {
    if (!isDay(request.from) || !isDay(request.to)) throw new ShopifyError("Fechas no válidas: usa el formato AAAA-MM-DD.", 400);
    const to = request.to > today ? today : request.to;
    if (request.from > to) throw new ShopifyError("La fecha inicial debe ser anterior a la final.", 400);
    if (dayCount(request.from, to) > MAX_DAYS) throw new ShopifyError(`El rango máximo es de ${MAX_DAYS} días.`, 400);
    return { from: request.from, to };
  }
  const [year, month] = today.split("-").map(Number);
  const firstOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
  switch (request.preset ?? "30d") {
    case "7d":
      return { from: addDays(today, -6), to: today };
    case "60d":
      return { from: addDays(today, -59), to: today };
    case "90d":
      return { from: addDays(today, -89), to: today };
    case "month":
      return { from: firstOfMonth, to: today };
    case "lastMonth": {
      const lastDay = addDays(firstOfMonth, -1);
      return { from: `${lastDay.slice(0, 7)}-01`, to: lastDay };
    }
    default:
      return { from: addDays(today, -29), to: today };
  }
}

export async function buildShopifyAnalytics(connection: ShopifyConnection, request: AnalyticsRequest): Promise<AnalyticsDataset> {
  const shop = await getShopifyShopInfo(connection);
  const tz = shop.timezone;
  const now = new Date();
  const range = resolveRange(request, localDay(now, tz));

  const length = dayCount(range.from, range.to);
  const previousRange = { from: addDays(range.from, -length), to: addDays(range.from, -1) };

  const fullHistory = shop.scopes.includes("read_all_orders");
  const historyStart = new Date(now.getTime() - DEFAULT_HISTORY_DAYS * 86_400_000);
  const notices: string[] = [];

  if (!fullHistory && startOfDay(range.from, tz) < historyStart) {
    notices.push(
      "Shopify solo entrega pedidos de los últimos 60 días a esta app: el inicio del período puede verse incompleto. Agrega el permiso read_all_orders a la app para ver todo el historial.",
    );
  }
  let compare = request.compare;
  if (compare && !fullHistory && startOfDay(previousRange.from, tz) < historyStart) {
    compare = false;
    notices.push("La comparación con el período anterior no está disponible: ese período tiene más de 60 días (requiere el permiso read_all_orders).");
  }

  const fetchFrom = startOfDay(compare ? previousRange.from : range.from, tz);
  const fetchTo = new Date(startOfDay(addDays(range.to, 1), tz).getTime() - 1);
  const { orders, truncated } = await fetchShopifyOrders(connection, fetchFrom, fetchTo);
  if (truncated) notices.push("El período tiene más pedidos de los que se cargan de una vez: acorta el rango para ver cifras exactas.");

  const handle = shop.domain.replace(/\.myshopify\.com$/, "");
  const compact: AnalyticsOrder[] = orders.map((order) => {
    const created = new Date(order.date);
    const parts = zonedParts(created, tz);
    const day = localDay(created, tz);
    return {
      id: order.id,
      code: order.code,
      period: day < range.from ? "previous" : "current",
      day,
      weekday: parts.weekday,
      hour: parts.hour,
      createdAt: order.date,
      amount: order.amount,
      sale: order.countsAsSale,
      status: order.status,
      statusName: order.statusName,
      channel: order.attribution.channel,
      campaign: order.attribution.campaign,
      items: order.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        revenue: item.revenue,
      })),
    };
  });

  return {
    shop: { name: shop.name, domain: shop.domain, primaryDomain: shop.primaryDomain, currency: shop.currency, timezone: tz },
    orderUrlTemplate: `https://admin.shopify.com/store/${handle}/orders/{id}`,
    range,
    previous: compare ? previousRange : null,
    notices,
    fetchedAt: now.toISOString(),
    orders: compact,
  };
}
