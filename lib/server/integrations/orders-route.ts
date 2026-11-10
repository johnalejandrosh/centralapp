/**
 * Lógica común de los Route Handlers GET /api/<proveedor>/orders: sesión y permiso,
 * validación de parámetros, credenciales desde la tabla `integrations`, consulta al
 * proveedor y cruce con la inversión (CPA / ROAS).
 *
 * Parámetros (query string):
 *   integrationId  conexión de la tabla `integrations` (opcional: por defecto la primera activa)
 *   from, to       rango en ISO 8601 (por defecto, los últimos 7 días). "2026-11-01" es medianoche UTC;
 *                  para tu zona horaria usa p. ej. "2026-11-01T00:00:00-05:00".
 *   spend          inversión en pauta del período, en la moneda de la tienda → calcula CPA y ROAS
 *   product        ID, SKU o parte del nombre: limita el cálculo a las órdenes con ese producto
 *   onlyAds        "1" para contar solo órdenes con anuncio o campaña (ad_id / utm_campaign)
 *   limit          cuántas órdenes devolver en el detalle (por defecto 50, máx. 500)
 */
import "server-only";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PROVIDERS, type ProviderId } from "@/lib/integrations/catalog";
import { summarizeSales, type OrdersReport } from "@/lib/integrations/metrics";
import type { AppOrder } from "@/lib/orders";
import { getCurrentUser, hasPermission } from "@/lib/server/dal";
import { recordIntegrationResult, resolveConnection, type IntegrationConnection } from "@/lib/server/integration-queries";
import { IntegrationError } from "./errors";

const DAY_MS = 86_400_000;
const MAX_RANGE_DAYS = 93;

const dateParam = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: "custom", message: `Fecha no válida: "${value}". Usa ISO 8601, p. ej. 2026-11-01.` });
      return z.NEVER;
    }
    return date;
  });

const querySchema = z.object({
  integrationId: z.string().trim().min(1).optional(),
  from: dateParam.optional(),
  to: dateParam.optional(),
  spend: z.coerce.number({ error: "spend debe ser un número." }).min(0, { error: "spend no puede ser negativo." }).optional(),
  product: z.string().trim().max(120).optional(),
  onlyAds: z
    .enum(["1", "0", "true", "false"])
    .transform((value) => value === "1" || value === "true")
    .optional(),
  limit: z.coerce.number().int().min(0).max(500).default(50),
});

function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

export type OrdersFetcher = (
  connection: IntegrationConnection,
  from: Date,
  to: Date,
) => Promise<{ orders: AppOrder[]; truncated: boolean }>;

/** Crea el handler GET de órdenes de un proveedor. */
export function ordersRoute(providerId: ProviderId, fetchOrders: OrdersFetcher) {
  const provider = PROVIDERS[providerId];

  return async function GET(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return fail(401, "Tu sesión expiró. Vuelve a iniciar sesión.");
    if (!hasPermission(user, PERMISSIONS.INTEGRATIONS_SYNC)) return fail(403, "No tienes el permiso integrations.sync.");

    const params = Object.fromEntries([...request.nextUrl.searchParams].filter(([, value]) => value !== ""));
    const parsed = querySchema.safeParse(params);
    if (!parsed.success) return fail(400, parsed.error.issues[0]?.message ?? "Parámetros no válidos.");

    const query = parsed.data;
    const to = query.to ?? new Date();
    const from = query.from ?? new Date(to.getTime() - 7 * DAY_MS);
    if (from >= to) return fail(400, "La fecha inicial debe ser anterior a la final.");
    if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * DAY_MS) {
      return fail(400, `El rango máximo es de ${MAX_RANGE_DAYS} días. Divide la consulta en períodos más cortos.`);
    }

    const connection = await resolveConnection(providerId, query.integrationId);
    if (!connection) {
      return fail(
        404,
        query.integrationId
          ? "La conexión no existe, está inactiva o le faltan credenciales."
          : `No hay ninguna tienda de ${provider.name} conectada. Agrégala en Integraciones → ${provider.name}.`,
      );
    }

    try {
      const { orders, truncated } = await fetchOrders(connection, from, to);
      await recordIntegrationResult(connection.integrationId, { ok: true });

      const summary = summarizeSales(orders, query.spend ?? null, { product: query.product, onlyAds: query.onlyAds });
      const recent = [...orders].sort((a, b) => b.date.localeCompare(a.date)).slice(0, query.limit);

      return Response.json({
        integration: { id: connection.integrationId, name: connection.name, shopId: connection.externalId },
        range: { from: from.toISOString(), to: to.toISOString() },
        filters: { product: query.product ?? null, onlyAds: Boolean(query.onlyAds) },
        truncated,
        summary,
        orders: recent,
      } satisfies OrdersReport);
    } catch (error) {
      if (error instanceof IntegrationError) {
        await recordIntegrationResult(connection.integrationId, { ok: false, error: error.message });
        return fail(502, error.message);
      }
      throw error;
    }
  };
}
