/**
 * Cliente del GraphQL Admin API de Shopify. Solo corre en el servidor.
 *
 * Credenciales (tabla `integrations`):
 *   external_id  dominio de la tienda (mitienda.myshopify.com)
 *   api_key      Client ID de la app del Dev Dashboard, o un token `shpat_` de una app
 *                personalizada antigua (creada en el admin antes del 1 de enero de 2026)
 *   api_secret   Client secret de la app del Dev Dashboard
 *   access_token / token_expires_at
 *                token que devuelve Shopify con el "client credentials grant"; dura 24 h y se
 *                reutiliza hasta un minuto antes de vencer.
 *
 * Token: POST https://{tienda}.myshopify.com/admin/oauth/access_token
 *        grant_type=client_credentials&client_id=…&client_secret=…
 * (solo funciona si la app y la tienda son de la misma organización de Shopify).
 */
import "server-only";
import { isStaticShopifyToken } from "@/lib/integrations/catalog";
import type { AppOrder, AppOrderItem, OrderStatus } from "@/lib/orders";
import { db } from "@/lib/server/db";
import { IntegrationError } from "./errors";

export const SHOPIFY_API_VERSION = "2026-10";

/**
 * Costo máximo de una consulta GraphQL: 1.000 puntos. Cada objeto anidado suma, así que
 * 30 órdenes × (≈31 puntos con hasta 5 líneas) ≈ 930 puntos por página.
 */
const PAGE_SIZE = 30;
const LINE_ITEMS = 5;
/** Tope de páginas por consulta (30 × 70 = 2.100 órdenes). */
const MAX_PAGES = 70;
const TIMEOUT_MS = 20_000;
const MAX_THROTTLE_RETRIES = 4;

export class ShopifyError extends IntegrationError {}

export type ShopifyConnection = {
  integrationId: string;
  /** Dominio .myshopify.com. */
  shopDomain: string;
  /** Client ID o token `shpat_`. */
  apiKey: string;
  clientSecret: string | null;
  accessToken: string | null;
  tokenExpiresAt: Date | null;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ----------------------------------------------------------------- Dominio propio → .myshopify.com

const MYSHOPIFY_DOMAIN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
/** Nombre de host público: con punto y TLD de letras (descarta IPs, "localhost" y nombres internos). */
const PUBLIC_HOSTNAME = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const INTERNAL_TLDS = new Set(["local", "localhost", "internal", "lan", "home", "corp", "intranet", "test", "invalid", "example"]);
const STOREFRONT_TIMEOUT_MS = 8_000;

function isPublicHostname(host: string) {
  return PUBLIC_HOSTNAME.test(host) && !INTERNAL_TLDS.has(host.split(".").pop() ?? "");
}

/**
 * GET a la tienda pública siguiendo redirecciones a mano (máx. 3) para validar cada destino:
 * así una redirección no puede llevar la petición a una IP o a un host interno.
 */
async function fetchStorefront(host: string, path: string): Promise<Response | null> {
  let url = new URL(`https://${host}${path}`);
  for (let hop = 0; hop < 4; hop++) {
    if (url.protocol !== "https:" || !isPublicHostname(url.hostname)) return null;
    const response = await fetch(url, {
      headers: { Accept: path.endsWith(".json") ? "application/json" : "text/html", "User-Agent": "CentralApp" },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(STOREFRONT_TIMEOUT_MS),
    }).catch(() => null);
    if (!response) return null;
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      url = new URL(location, url);
      continue;
    }
    return response.ok ? response : null;
  }
  return null;
}

/**
 * Devuelve el dominio .myshopify.com de una tienda. Acepta el propio .myshopify.com o el dominio
 * personalizado (mitienda.com): la tienda pública de Shopify lo expone en /meta.json
 * (`myshopify_domain`) y en su HTML (`Shopify.shop = "…"`). No funciona con tiendas "headless",
 * cuya tienda pública no la sirve Shopify.
 */
export async function resolveShopifyDomain(domain: string): Promise<{ domain: string; name: string | null; customDomain: string | null }> {
  if (MYSHOPIFY_DOMAIN.test(domain)) return { domain, name: null, customDomain: null };
  if (!isPublicHostname(domain)) {
    throw new ShopifyError("Escribe el dominio de tu tienda, p. ej. mitienda.com o mitienda.myshopify.com.");
  }

  const meta = await fetchStorefront(domain, "/meta.json");
  const json = meta ? ((await meta.json().catch(() => null)) as { myshopify_domain?: string; name?: string } | null) : null;
  const fromMeta = json?.myshopify_domain?.trim().toLowerCase();
  if (fromMeta && MYSHOPIFY_DOMAIN.test(fromMeta)) return { domain: fromMeta, name: json?.name?.trim() || null, customDomain: domain };

  const home = await fetchStorefront(domain, "/");
  const html = home ? await home.text().catch(() => "") : "";
  const fromHtml = html.slice(0, 2_000_000).match(/Shopify\.shop\s*=\s*["']([a-z0-9][a-z0-9-]*\.myshopify\.com)["']/i)?.[1]?.toLowerCase();
  if (fromHtml) return { domain: fromHtml, name: null, customDomain: domain };

  throw new ShopifyError(
    `No encontramos una tienda Shopify en ${domain}. Si tu tienda es "headless" o el dominio no es de Shopify, copia el dominio .myshopify.com desde Configuración → Dominios en el admin.`,
  );
}

// ----------------------------------------------------------------- Token

/** Token para el Admin API: el `shpat_` fijo, el guardado si sigue vigente o uno nuevo. */
async function accessToken(connection: ShopifyConnection, forceRefresh = false): Promise<string> {
  if (isStaticShopifyToken(connection.apiKey)) return connection.apiKey;

  const stillValid = connection.tokenExpiresAt && connection.tokenExpiresAt.getTime() - Date.now() > 60_000;
  if (!forceRefresh && connection.accessToken && stillValid) return connection.accessToken;
  if (!connection.clientSecret) throw new ShopifyError("Falta el Client secret de la app de Shopify.");

  let response: Response;
  try {
    response = await fetch(`https://${connection.shopDomain}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: connection.apiKey,
        client_secret: connection.clientSecret,
      }),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ShopifyError(`No se pudo contactar a ${connection.shopDomain}. Revisa el dominio.`);
  }

  const body = (await response.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
  } | null;

  if (response.status === 404 || (response.status >= 300 && response.status < 400)) {
    throw new ShopifyError(`No existe la tienda ${connection.shopDomain}. Usa el dominio .myshopify.com.`, response.status);
  }
  if (body?.error === "shop_not_permitted") {
    throw new ShopifyError(
      "La app y la tienda no pertenecen a la misma organización de Shopify. Crea la app en el Dev Dashboard con la cuenta dueña de la tienda.",
      response.status,
    );
  }
  if (!response.ok || !body?.access_token) {
    const detail = body?.error_description || body?.error;
    throw new ShopifyError(
      `Shopify rechazó el Client ID o el Client secret, o la app no está instalada en la tienda${detail ? ` (${String(detail).slice(0, 160)})` : ""}.`,
      response.status,
    );
  }

  const scopes = (body.scope ?? "").split(",").map((scope) => scope.trim());
  if (body.scope !== undefined && !scopes.includes("read_orders") && !scopes.includes("write_orders")) {
    throw new ShopifyError("La app no tiene el permiso read_orders. Agrégalo en una nueva versión de la app y apruébalo en la tienda.");
  }

  const expiresAt = new Date(Date.now() + (body.expires_in ?? 86_399) * 1000);
  connection.accessToken = body.access_token;
  connection.tokenExpiresAt = expiresAt;
  await db.integration.updateMany({
    where: { id: connection.integrationId },
    data: { accessToken: body.access_token, tokenExpiresAt: expiresAt },
  });
  return body.access_token;
}

// ----------------------------------------------------------------- GraphQL

type GraphqlError = {
  message: string;
  path?: (string | number)[];
  extensions?: { code?: string; cost?: { requestedQueryCost?: number; throttleStatus?: { currentlyAvailable?: number; restoreRate?: number } } };
};

type GraphqlBody<T> = { data?: T | null; errors?: GraphqlError[]; extensions?: GraphqlError["extensions"] };

async function graphql<T>(connection: ShopifyConnection, query: string, variables: Record<string, unknown> = {}) {
  let refreshed = false;

  for (let attempt = 0; ; attempt++) {
    const token = await accessToken(connection, refreshed);
    let response: Response;
    try {
      response = await fetch(`https://${connection.shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-Shopify-Access-Token": token },
        body: JSON.stringify({ query, variables }),
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "TimeoutError";
      throw new ShopifyError(timedOut ? "Shopify no respondió a tiempo. Inténtalo de nuevo." : "No se pudo contactar a Shopify.");
    }

    // Token revocado o vencido antes de tiempo: se pide uno nuevo una sola vez.
    if (response.status === 401 && !refreshed && !isStaticShopifyToken(connection.apiKey)) {
      refreshed = true;
      continue;
    }
    if (response.status === 401) throw new ShopifyError("Shopify rechazó el token de acceso. Revisa las credenciales.", 401);
    if (response.status === 402) throw new ShopifyError("La tienda está congelada o sin un plan activo en Shopify.", 402);
    if (response.status === 403) throw new ShopifyError("La app no tiene permiso para leer pedidos (read_orders).", 403);
    if (response.status === 404) throw new ShopifyError(`No existe la tienda ${connection.shopDomain}.`, 404);
    if (response.status === 423) throw new ShopifyError("La tienda está bloqueada en Shopify.", 423);
    if ((response.status === 429 || response.status >= 500) && attempt < MAX_THROTTLE_RETRIES) {
      await sleep(1000 * (attempt + 1));
      continue;
    }
    if (!response.ok) throw new ShopifyError(`Shopify respondió con un error (HTTP ${response.status}).`, response.status);

    const body = (await response.json().catch(() => null)) as GraphqlBody<T> | null;
    if (!body) throw new ShopifyError("Shopify devolvió una respuesta que no se pudo leer.");

    // Límite de costo: se espera lo que falte para recuperar los puntos y se reintenta.
    const throttled = body.errors?.some((error) => error.extensions?.code === "THROTTLED");
    if (throttled && attempt < MAX_THROTTLE_RETRIES) {
      const cost = body.extensions?.cost;
      const needed = (cost?.requestedQueryCost ?? 1000) - (cost?.throttleStatus?.currentlyAvailable ?? 0);
      const rate = cost?.throttleStatus?.restoreRate || 100;
      await sleep(Math.min(10_000, Math.max(500, Math.ceil((needed / rate) * 1000))));
      continue;
    }
    if (throttled) throw new ShopifyError("Shopify está limitando las consultas. Espera unos segundos e inténtalo de nuevo.", 429);

    return { data: body.data ?? null, errors: body.errors ?? [] };
  }
}

function errorMessage(errors: GraphqlError[]) {
  const denied = errors.find((error) => error.extensions?.code === "ACCESS_DENIED");
  if (denied) return `La app no tiene los permisos necesarios: ${denied.message.slice(0, 200)}`;
  return `Shopify respondió con un error: ${errors[0]?.message.slice(0, 200) ?? "desconocido"}`;
}

// ----------------------------------------------------------------- Consultas

export type ShopifyShop = { name: string; domain: string; currency: string | null };

/** Valida credenciales y permisos: datos de la tienda y conteo de pedidos (read_orders). */
export async function testShopifyConnection(connection: ShopifyConnection) {
  const { data, errors } = await graphql<{
    shop: { name: string; myshopifyDomain: string; currencyCode: string } | null;
    ordersCount: { count: number; precision: "EXACT" | "AT_LEAST" } | null;
  }>(connection, `query CentralAppShop { shop { name myshopifyDomain currencyCode } ordersCount { count precision } }`);

  if (errors.length > 0 || !data?.shop) throw new ShopifyError(errorMessage(errors));
  return {
    shop: { name: data.shop.name, domain: data.shop.myshopifyDomain, currency: data.shop.currencyCode } satisfies ShopifyShop,
    totalOrders: data.ordersCount?.count ?? null,
    exact: data.ordersCount?.precision !== "AT_LEAST",
  };
}

export type ShopifyShopInfo = {
  name: string;
  domain: string;
  primaryDomain: string | null;
  currency: string;
  timezone: string;
  /** Permisos que la tienda le concedió a la app (p. ej. read_all_orders para pedidos de más de 60 días). */
  scopes: string[];
};

/** Nombre, moneda, zona horaria y permisos de la tienda (consulta liviana: ~4 puntos). */
export async function getShopifyShopInfo(connection: ShopifyConnection): Promise<ShopifyShopInfo> {
  const { data, errors } = await graphql<{
    shop: { name: string; currencyCode: string; ianaTimezone: string; myshopifyDomain: string; primaryDomain: { host: string } | null } | null;
    currentAppInstallation: { accessScopes: { handle: string }[] } | null;
  }>(
    connection,
    `query CentralAppShopInfo { shop { name currencyCode ianaTimezone myshopifyDomain primaryDomain { host } } currentAppInstallation { accessScopes { handle } } }`,
  );
  if (!data?.shop) throw new ShopifyError(errorMessage(errors));
  return {
    name: data.shop.name,
    domain: data.shop.myshopifyDomain,
    primaryDomain: data.shop.primaryDomain?.host ?? null,
    currency: data.shop.currencyCode,
    timezone: data.shop.ianaTimezone,
    scopes: data.currentAppInstallation?.accessScopes.map((scope) => scope.handle) ?? [],
  };
}

type Money = { shopMoney: { amount: string } } | null;

type ShopifyRawOrder = {
  id: string;
  name: string;
  createdAt: string;
  cancelledAt: string | null;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string | null;
  sourceName: string | null;
  /** App que creó el pedido (p. ej. un formulario contra entrega); `sourceName` trae solo su ID. */
  app?: { name: string } | null;
  currentSubtotalPriceSet: Money;
  totalShippingPriceSet: Money;
  customerJourneySummary?: {
    lastVisit: { source: string | null; utmParameters: { campaign: string | null; source: string | null } | null } | null;
  } | null;
  lineItems: {
    nodes: {
      title: string;
      sku: string | null;
      quantity: number;
      product?: { id: string } | null;
      originalUnitPriceSet: Money;
    }[];
  };
};

/**
 * Campos opcionales: si la app no tiene el permiso (read_products para `product`; el
 * resumen del recorrido del cliente para el origen UTM), se quitan y la consulta sigue.
 */
type OptionalFields = { journey: boolean; product: boolean };

function ordersQuery({ journey, product }: OptionalFields) {
  return `query CentralAppOrders($first: Int!, $after: String, $query: String!) {
  orders(first: $first, after: $after, query: $query, sortKey: CREATED_AT) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id name createdAt cancelledAt displayFinancialStatus displayFulfillmentStatus sourceName app { name }
      currentSubtotalPriceSet { shopMoney { amount } }
      totalShippingPriceSet { shopMoney { amount } }
      ${journey ? "customerJourneySummary { lastVisit { source utmParameters { campaign source } } }" : ""}
      lineItems(first: ${LINE_ITEMS}) {
        nodes { title sku quantity ${product ? "product { id }" : ""} originalUnitPriceSet { shopMoney { amount } } }
      }
    }
  }
}`;
}

const isOptionalDenied = (error: GraphqlError, field: string) =>
  error.extensions?.code === "ACCESS_DENIED" && (error.path?.includes(field) || error.message.includes(field));

type OrdersPage = {
  orders: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: ShopifyRawOrder[] } | null;
};

/** Todas las órdenes creadas entre `from` y `to` (paginando con cursores). */
export async function fetchShopifyOrders(connection: ShopifyConnection, from: Date, to: Date) {
  const fields: OptionalFields = { journey: true, product: true };
  const search = `created_at:>='${from.toISOString()}' AND created_at:<='${to.toISOString()}'`;
  const raw: ShopifyRawOrder[] = [];
  let after: string | null = null;
  let truncated = false;

  for (let page = 1; ; ) {
    const { data, errors }: { data: OrdersPage | null; errors: GraphqlError[] } = await graphql<OrdersPage>(
      connection,
      ordersQuery(fields),
      { first: PAGE_SIZE, after, query: search },
    );

    const journeyDenied = errors.some((error) => isOptionalDenied(error, "customerJourneySummary"));
    const productDenied = errors.some((error) => isOptionalDenied(error, "product"));
    const otherErrors = errors.filter(
      (error) => !isOptionalDenied(error, "customerJourneySummary") && !isOptionalDenied(error, "product"),
    );
    if (journeyDenied) fields.journey = false;
    if (productDenied) fields.product = false;

    if (!data?.orders) {
      // Sin datos por un campo opcional: se repite la misma página sin ese campo.
      if (otherErrors.length === 0 && (journeyDenied || productDenied)) continue;
      throw new ShopifyError(errorMessage(otherErrors.length > 0 ? otherErrors : errors));
    }
    if (otherErrors.length > 0) throw new ShopifyError(errorMessage(otherErrors));

    raw.push(...data.orders.nodes);
    const { hasNextPage, endCursor }: { hasNextPage: boolean; endCursor: string | null } = data.orders.pageInfo;
    if (!hasNextPage || !endCursor) break;
    if (page >= MAX_PAGES) {
      truncated = true;
      break;
    }
    after = endCursor;
    page++;
  }

  return { orders: raw.map(normalizeShopifyOrder), truncated };
}

// ----------------------------------------------------------------- Normalización

const FINANCIAL: Record<string, string> = {
  PENDING: "Pago pendiente",
  AUTHORIZED: "Pago autorizado",
  PARTIALLY_PAID: "Pago parcial",
  PAID: "Pagada",
  PARTIALLY_REFUNDED: "Reembolso parcial",
  REFUNDED: "Reembolsada",
  VOIDED: "Anulada",
  EXPIRED: "Vencida",
};

const FULFILLMENT: Record<string, string> = {
  UNFULFILLED: "sin enviar",
  PARTIALLY_FULFILLED: "enviada en parte",
  FULFILLED: "enviada",
  IN_PROGRESS: "en preparación",
  ON_HOLD: "en espera",
  OPEN: "sin enviar",
  PENDING_FULFILLMENT: "por enviar",
  SCHEDULED: "programada",
  RESTOCKED: "reabastecida",
  REQUEST_DECLINED: "solicitud rechazada",
  FULFILLMENT_NOT_REQUIRED: "sin envío pendiente",
};

/** Estado de Shopify (pago + envío + cancelación) → estado de la app. */
function mapStatus(order: ShopifyRawOrder): { status: OrderStatus; name: string; sale: boolean } {
  const financial = order.displayFinancialStatus ?? "";
  const fulfillment = order.displayFulfillmentStatus ?? "";
  const label = [FINANCIAL[financial] ?? financial, FULFILLMENT[fulfillment] ?? fulfillment.toLowerCase()].filter(Boolean).join(" · ");

  if (order.cancelledAt) return { status: "Cancelado", name: "Cancelada", sale: false };
  if (financial === "REFUNDED" || financial === "VOIDED" || financial === "EXPIRED") {
    return { status: "Cancelado", name: label, sale: false };
  }
  if (financial === "PAID" || financial === "PARTIALLY_REFUNDED") return { status: "Pagado", name: label, sale: true };
  if (fulfillment === "FULFILLED" || fulfillment === "PARTIALLY_FULFILLED") return { status: "Enviado", name: label, sale: true };
  // Pago pendiente o autorizado (p. ej. contra entrega): cuenta como venta, igual que en Pancake.
  return { status: "Pendiente", name: label || "Pendiente", sale: true };
}

const money = (value: Money) => Number(value?.shopMoney.amount ?? 0) || 0;
/** "gid://shopify/Order/123" → "123". */
const numericId = (gid: string | null | undefined) => (gid ? gid.split("/").pop() ?? gid : null);

const SOURCES: Record<string, string> = {
  web: "Tienda online",
  pos: "Punto de venta",
  shopify_draft_order: "Pedido borrador",
  iphone: "App Shopify",
  android: "App Shopify",
};

export function normalizeShopifyOrder(order: ShopifyRawOrder): AppOrder {
  const { status, name, sale } = mapStatus(order);
  const amount = money(order.currentSubtotalPriceSet);

  const lines = order.lineItems.nodes.map((item) => {
    const unitPrice = money(item.originalUnitPriceSet);
    return { item, unitPrice, gross: unitPrice * item.quantity };
  });
  // El subtotal ya trae los descuentos: se reparte entre las líneas según su valor de lista.
  const grossTotal = lines.reduce((sum, line) => sum + line.gross, 0);

  const items: AppOrderItem[] = lines.map(({ item, unitPrice, gross }) => ({
    productId: numericId(item.product?.id) ?? item.sku ?? item.title,
    variationId: null,
    name: item.title || "Producto sin nombre",
    sku: item.sku || null,
    quantity: item.quantity,
    unitPrice,
    revenue: grossTotal > 0 ? (amount * gross) / grossTotal : amount / Math.max(1, lines.length),
  }));

  const visit = order.customerJourneySummary?.lastVisit;
  return {
    id: numericId(order.id) ?? order.id,
    provider: "shopify",
    code: order.name.replace(/^#/, ""),
    // Sin datos personales del cliente: requieren un permiso aparte (protected customer data).
    customer: "",
    phone: null,
    date: new Date(order.createdAt).toISOString(),
    amount,
    shippingFee: money(order.totalShippingPriceSet),
    status,
    statusCode: null,
    statusName: name,
    countsAsSale: sale,
    items,
    attribution: {
      channel:
        visit?.utmParameters?.source ??
        visit?.source ??
        order.app?.name ??
        (order.sourceName ? SOURCES[order.sourceName] ?? order.sourceName : null),
      adId: null,
      campaign: visit?.utmParameters?.campaign ?? null,
    },
  };
}
