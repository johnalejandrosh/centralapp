/**
 * Consultas de la tabla `integrations`. Las funciones de listado nunca devuelven credenciales
 * (solo una pista con los últimos caracteres); las credenciales completas se leen únicamente
 * para llamar al proveedor desde el servidor.
 */
import "server-only";
import { cache } from "react";
import type { IntegrationStatus } from "@/generated/prisma/client";
import type { ProviderId } from "@/lib/integrations/catalog";
import { db } from "./db";

/** "••••a1b2": suficiente para reconocer qué clave está guardada sin exponerla. */
function secretHint(value: string | null) {
  if (!value) return null;
  return `••••${value.slice(-4)}`;
}

/** Memorizada por request: cada página de proveedor la usa en dos secciones. */
export const listIntegrations = cache(async (provider?: ProviderId) => {
  const rows = await db.integration.findMany({
    where: provider ? { provider } : undefined,
    orderBy: [{ provider: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      provider: true,
      name: true,
      externalId: true,
      apiKey: true,
      apiSecret: true,
      status: true,
      active: true,
      lastSyncAt: true,
      lastError: true,
      createdAt: true,
      createdBy: { select: { name: true } },
    },
  });

  return rows.map(({ apiKey, apiSecret, createdBy, lastSyncAt, createdAt, ...row }) => ({
    ...row,
    apiKeyHint: secretHint(apiKey),
    apiSecretHint: secretHint(apiSecret),
    createdByName: createdBy?.name ?? null,
    lastSyncAt: lastSyncAt?.toISOString() ?? null,
    createdAt: createdAt.toISOString(),
  }));
});

export type IntegrationRow = Awaited<ReturnType<typeof listIntegrations>>[number];

/** Conexión con sus credenciales completas. Solo para el servidor: nunca se pasa a un componente cliente. */
export type IntegrationConnection = {
  integrationId: string;
  provider: ProviderId;
  name: string;
  externalId: string;
  apiKey: string;
  apiSecret: string | null;
  accessToken: string | null;
  tokenExpiresAt: Date | null;
};

/**
 * Credenciales para consultar a un proveedor desde el servidor. Salen siempre de la tabla
 * `integrations` (no de variables de entorno):
 * - Con `integrationId`, esa conexión.
 * - Sin él, la primera conexión activa del proveedor con credenciales completas.
 * Devuelve `null` si no existe, está inactiva o le falta el identificador o la clave.
 */
export async function resolveConnection(provider: ProviderId, integrationId?: string | null): Promise<IntegrationConnection | null> {
  const row = await db.integration.findFirst({
    where: {
      provider,
      active: true,
      apiKey: { not: null },
      externalId: { not: null },
      ...(integrationId && { id: integrationId }),
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, externalId: true, apiKey: true, apiSecret: true, accessToken: true, tokenExpiresAt: true },
  });

  if (!row?.apiKey || !row.externalId) return null;
  return {
    integrationId: row.id,
    provider,
    name: row.name,
    externalId: row.externalId,
    apiKey: row.apiKey,
    apiSecret: row.apiSecret,
    accessToken: row.accessToken,
    tokenExpiresAt: row.tokenExpiresAt,
  };
}

/** Datos de conexión de Shopify a partir de una fila con credenciales. */
export function toShopifyConnection(connection: IntegrationConnection) {
  return {
    integrationId: connection.integrationId,
    shopDomain: connection.externalId,
    apiKey: connection.apiKey,
    clientSecret: connection.apiSecret,
    accessToken: connection.accessToken,
    tokenExpiresAt: connection.tokenExpiresAt,
  };
}

/** Guarda el resultado de la última prueba o sincronización. */
export async function recordIntegrationResult(id: string, result: { ok: true } | { ok: false; error: string }) {
  const status: IntegrationStatus = result.ok ? "CONNECTED" : "ERROR";
  await db.integration.updateMany({
    where: { id },
    data: result.ok
      ? { status, lastSyncAt: new Date(), lastError: null }
      : { status, lastError: result.error.slice(0, 500) },
  });
}
