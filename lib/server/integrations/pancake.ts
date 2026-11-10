/**
 * Cliente de la API de Pancake POS. Solo corre en el servidor: la api_key nunca llega al navegador.
 *
 *   GET https://pos.pages.fm/api/v1/shops/{shop_id}/orders?api_key=…&startDateTime=…&endDateTime=…
 *
 * Las credenciales (Shop ID y api_key) vienen de la tabla `integrations`, nunca del .env.
 * Referencia de parámetros (page_size, page_number, startDateTime/endDateTime en segundos
 * Unix, updateStatus, filter_status…): documentación de la API de Pancake POS.
 */
import "server-only";
import type { AppOrder, AppOrderItem, OrderStatus } from "@/lib/orders";
import { IntegrationError } from "./errors";

const PANCAKE_API_URL = "https://pos.pages.fm/api/v1";
const PAGE_SIZE = 100;
/** Tope de páginas por consulta (100 × 30 = 3.000 órdenes) para no quedar en un bucle largo. */
const MAX_PAGES = 30;
const TIMEOUT_MS = 15_000;

export type PancakeCredentials = { apiKey: string; shopId: string };

/** Error de Pancake con un mensaje apto para mostrar al usuario (nunca incluye la api_key). */
export class PancakeError extends IntegrationError {}

type PancakeList<T> = {
  success?: boolean;
  message?: string;
  data?: T[];
  page_number?: number;
  page_size?: number;
  total_entries?: number;
  total_pages?: number;
};

async function pancakeGet<T>(path: string, apiKey: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(`${PANCAKE_API_URL}${path}`);
  url.searchParams.set("api_key", apiKey);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    throw new PancakeError(timedOut ? "Pancake POS no respondió a tiempo. Inténtalo de nuevo." : "No se pudo contactar a Pancake POS.");
  }

  const body = (await response.json().catch(() => null)) as (T & { success?: boolean; message?: string }) | null;
  // Mensaje original de Pancake (p. ej. "api_key is invalid"), útil para diagnosticar.
  const detail = body?.message ? ` (${String(body.message).slice(0, 200)})` : "";

  if (response.status === 401 || response.status === 403) {
    throw new PancakeError(`Pancake rechazó la api_key o no tiene acceso a esa tienda${detail}.`, response.status);
  }
  if (response.status === 404) {
    throw new PancakeError(`Pancake no encontró la tienda. Revisa el Shop ID${detail}.`, response.status);
  }
  if (!response.ok || !body || body.success === false) {
    throw new PancakeError(`Pancake POS respondió con un error${detail || ` (HTTP ${response.status})`}.`, response.status);
  }
  return body;
}

export type PancakeShop = { id: string; name: string; currency: string | null };

/**
 * Tiendas a las que tiene acceso una api_key: GET /shops?api_key=…
 * Respuesta: { success, shops: [{ id, name, currency, pages, avatar_url, … }] }.
 * Permite completar el Shop ID sin que el usuario lo busque en el panel.
 */
export async function listPancakeShops(apiKey: string): Promise<PancakeShop[]> {
  const body = await pancakeGet<{ shops?: { id?: string | number; name?: string; currency?: string | null }[] }>("/shops", apiKey);
  return (body.shops ?? [])
    .filter((shop) => shop.id !== undefined && shop.id !== null)
    .map((shop) => ({ id: String(shop.id), name: shop.name?.trim() || `Tienda ${shop.id}`, currency: shop.currency ?? null }));
}

/** Valida credenciales pidiendo una sola orden de la tienda. */
export async function testPancakeConnection({ apiKey, shopId }: PancakeCredentials) {
  const body = await pancakeGet<PancakeList<unknown>>(`/shops/${encodeURIComponent(shopId)}/orders`, apiKey, {
    page_size: 1,
    page_number: 1,
  });
  return { totalOrders: typeof body.total_entries === "number" ? body.total_entries : null };
}

/** Trae todas las órdenes creadas entre `from` y `to` (paginando). */
export async function fetchPancakeOrders({ apiKey, shopId }: PancakeCredentials, from: Date, to: Date) {
  const raw: PancakeRawOrder[] = [];
  let truncated = false;

  for (let page = 1; ; page++) {
    const body = await pancakeGet<PancakeList<PancakeRawOrder>>(`/shops/${encodeURIComponent(shopId)}/orders`, apiKey, {
      page_size: PAGE_SIZE,
      page_number: page,
      updateStatus: "inserted_at",
      startDateTime: Math.floor(from.getTime() / 1000),
      endDateTime: Math.floor(to.getTime() / 1000),
    });
    const data = body.data ?? [];
    raw.push(...data);

    const lastPage = typeof body.total_pages === "number" ? page >= body.total_pages : data.length < PAGE_SIZE;
    if (lastPage || data.length === 0) break;
    if (page >= MAX_PAGES) {
      truncated = true;
      break;
    }
  }

  return { orders: raw.map(normalizePancakeOrder), truncated };
}

// ----------------------------------------------------------------- Normalización

/**
 * Estados de orden de Pancake POS → estados de la app.
 * `sale: false` = no es una venta efectiva (no suma ingresos ni cuenta para el CPA).
 */
const PANCAKE_STATUS: Record<number, { name: string; status: OrderStatus; sale: boolean }> = {
  0: { name: "Nuevo", status: "Pendiente", sale: true },
  1: { name: "Confirmado", status: "Pendiente", sale: true },
  2: { name: "Enviado", status: "Enviado", sale: true },
  3: { name: "Entregado", status: "Pagado", sale: true },
  4: { name: "En devolución", status: "Cancelado", sale: false },
  5: { name: "Devuelto", status: "Cancelado", sale: false },
  6: { name: "Cancelado", status: "Cancelado", sale: false },
  7: { name: "Eliminado", status: "Cancelado", sale: false },
  8: { name: "Empacando", status: "Pendiente", sale: true },
  9: { name: "Esperando recolección", status: "Pendiente", sale: true },
  11: { name: "Esperando stock", status: "Pendiente", sale: true },
  12: { name: "Por imprimir", status: "Pendiente", sale: true },
  13: { name: "Impreso", status: "Pendiente", sale: true },
  15: { name: "Devolución parcial", status: "Pagado", sale: true },
  16: { name: "Recaudado", status: "Pagado", sale: true },
  17: { name: "Esperando confirmación", status: "Pendiente", sale: true },
  20: { name: "Pedido a proveedor", status: "Pendiente", sale: true },
};

/**
 * Campos de la orden de Pancake que usa la app (la respuesta trae muchos más).
 * Verificado con una respuesta real: `system_id` es el número visible del pedido, `id` puede
 * ser el ID del canal de origen (p. ej. Shopify), `status_name` viene en inglés ("new") y el
 * descuento llega a nivel de orden (`total_discount`), no por ítem.
 */
type PancakeRawOrder = {
  id?: string | number;
  system_id?: string | number;
  inserted_at?: string;
  status?: number;
  status_name?: string;
  total_price?: number;
  total_price_after_sub_discount?: number;
  shipping_fee?: number;
  bill_full_name?: string;
  bill_phone_number?: string;
  order_sources_name?: string;
  ads_source?: string | null;
  ad_id?: string | number | null;
  p_utm_campaign?: string | null;
  p_utm_source?: string | null;
  items?: {
    product_id?: string | number;
    variation_id?: string | number;
    quantity?: number;
    variation_info?: { name?: string; display_id?: string; retail_price?: number } | null;
  }[];
};

const text = (value: unknown) => (value === null || value === undefined || value === "" ? null : String(value));
const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0);

/** Pancake devuelve fechas en UTC sin zona ("2026-11-07T14:49:00.000000"): se marcan como UTC. */
function toIsoUtc(value: string | undefined) {
  if (!value) return new Date(0).toISOString();
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  const date = new Date(hasZone ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

export function normalizePancakeOrder(order: PancakeRawOrder): AppOrder {
  const code = typeof order.status === "number" ? order.status : null;
  const known = code !== null ? PANCAKE_STATUS[code] : undefined;
  const amount = num(order.total_price_after_sub_discount ?? order.total_price);

  const lines = (order.items ?? []).map((item) => {
    const quantity = num(item.quantity) || 1;
    const unitPrice = num(item.variation_info?.retail_price);
    return { item, quantity, unitPrice, gross: quantity * unitPrice };
  });
  // El descuento es de la orden: el monto cobrado se reparte entre ítems según su valor de lista.
  const grossTotal = lines.reduce((sum, line) => sum + line.gross, 0);

  const items: AppOrderItem[] = lines.map(({ item, quantity, unitPrice, gross }) => ({
    productId: text(item.product_id) ?? text(item.variation_id) ?? "sin-id",
    variationId: text(item.variation_id),
    name: item.variation_info?.name?.trim() || "Producto sin nombre",
    sku: text(item.variation_info?.display_id),
    quantity,
    unitPrice,
    revenue: grossTotal > 0 ? (amount * gross) / grossTotal : amount / lines.length,
  }));

  return {
    id: text(order.id) ?? text(order.system_id) ?? "",
    provider: "pancake",
    code: text(order.system_id) ?? text(order.id) ?? "",
    customer: order.bill_full_name?.trim() || "Sin nombre",
    phone: text(order.bill_phone_number),
    date: toIsoUtc(order.inserted_at),
    amount,
    shippingFee: num(order.shipping_fee),
    status: known?.status ?? "Pendiente",
    statusCode: code,
    statusName: known?.name ?? (order.status_name?.trim() || "Desconocido"),
    countsAsSale: known?.sale ?? true,
    items,
    attribution: {
      channel: text(order.order_sources_name) ?? text(order.ads_source) ?? text(order.p_utm_source),
      adId: text(order.ad_id),
      campaign: text(order.p_utm_campaign),
    },
  };
}
