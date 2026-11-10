/**
 * GET /api/pancake/orders — órdenes de Pancake POS normalizadas y cruzadas con la inversión.
 *
 * La consulta a Pancake se hace aquí, en el servidor, para que la api_key nunca llegue al
 * navegador. Exige sesión y el permiso `integrations.sync`. Parámetros y respuesta en
 * lib/server/integrations/orders-route.ts.
 */
import { fetchPancakeOrders } from "@/lib/server/integrations/pancake";
import { ordersRoute } from "@/lib/server/integrations/orders-route";

export const GET = ordersRoute("pancake", (connection, from, to) =>
  fetchPancakeOrders({ apiKey: connection.apiKey, shopId: connection.externalId }, from, to),
);
