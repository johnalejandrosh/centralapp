/**
 * GET /api/shopify/analytics — pedidos compactos de Shopify para el tablero analítico.
 *
 * Exige sesión y el permiso `tablero1.view` (lo consume el Tablero 1). Las credenciales salen de la tabla `integrations`
 * y la consulta a Shopify se hace en el servidor.
 *
 * Parámetros:
 *   integrationId  conexión de Shopify (opcional: por defecto la primera activa)
 *   preset         7d | 30d | 60d | 90d | month | lastMonth (por defecto 30d)
 *   from, to       rango personalizado AAAA-MM-DD en la zona horaria de la tienda (reemplaza a preset)
 *   compare        "0" para no traer el período anterior (por defecto se compara)
 */
import type { NextRequest } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getCurrentUser, hasPermission } from "@/lib/server/dal";
import { recordIntegrationResult, resolveConnection, toShopifyConnection } from "@/lib/server/integration-queries";
import { IntegrationError } from "@/lib/server/integrations/errors";
import { buildShopifyAnalytics, RANGE_PRESETS, type RangePreset } from "@/lib/server/integrations/shopify-analytics";

function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return fail(401, "Tu sesión expiró. Vuelve a iniciar sesión.");
  if (!hasPermission(user, PERMISSIONS.TABLERO1_VIEW)) return fail(403, "No tienes el permiso tablero1.view.");

  const params = request.nextUrl.searchParams;
  const preset = params.get("preset");
  if (preset && !(RANGE_PRESETS as readonly string[]).includes(preset)) return fail(400, "Período no válido.");

  const connection = await resolveConnection("shopify", params.get("integrationId"));
  if (!connection) return fail(404, "No hay ninguna tienda de Shopify activa. Conéctala en Integraciones → Shopify.");

  try {
    const dataset = await buildShopifyAnalytics(toShopifyConnection(connection), {
      preset: (preset as RangePreset | null) ?? undefined,
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
      compare: params.get("compare") !== "0",
    });
    await recordIntegrationResult(connection.integrationId, { ok: true });
    return Response.json(dataset);
  } catch (error) {
    if (error instanceof IntegrationError) {
      // Un 400 es un error de los parámetros, no de la conexión.
      if (error.status === 400) return fail(400, error.message);
      await recordIntegrationResult(connection.integrationId, { ok: false, error: error.message });
      return fail(502, error.message);
    }
    throw error;
  }
}
