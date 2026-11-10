/**
 * GET /api/shopify/orders — pedidos de Shopify normalizados y cruzados con la inversión.
 *
 * La consulta a Shopify (GraphQL Admin API) se hace aquí, en el servidor: el Client secret y
 * el token de acceso nunca llegan al navegador. Exige sesión y el permiso `integrations.sync`.
 * Parámetros y respuesta en lib/server/integrations/orders-route.ts.
 */
import { toShopifyConnection } from "@/lib/server/integration-queries";
import { ordersRoute } from "@/lib/server/integrations/orders-route";
import { fetchShopifyOrders } from "@/lib/server/integrations/shopify";

export const GET = ordersRoute("shopify", (connection, from, to) => fetchShopifyOrders(toShopifyConnection(connection), from, to));
