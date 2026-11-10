"use server";

import { refresh } from "next/cache";
import type { ActionResult } from "@/lib/actions";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { isProviderId, PROVIDERS, type ProviderId } from "@/lib/integrations/catalog";
import { authorize } from "@/lib/server/dal";
import { db } from "@/lib/server/db";
import { recordIntegrationResult } from "@/lib/server/integration-queries";
import { IntegrationError } from "@/lib/server/integrations/errors";
import { listPancakeShops, testPancakeConnection } from "@/lib/server/integrations/pancake";
import { resolveShopifyDomain, testShopifyConnection } from "@/lib/server/integrations/shopify";
import { isNotFound, isUniqueViolation } from "@/lib/server/prisma-errors";
import { fieldErrorsOf, integrationSchema } from "@/lib/validation/admin";

export type IntegrationField = "provider" | "name" | "externalId" | "apiKey" | "apiSecret" | "active";

/** Cuenta del proveedor a la que da acceso una credencial (Pancake: una tienda). */
export type ProviderAccount = { id: string; name: string; currency: string | null };

export type AccountLookupResult = { ok: boolean; message?: string; accounts?: ProviderAccount[] };

const providerMessage = (error: unknown, fallback: string) => (error instanceof IntegrationError ? error.message : fallback);

const count = (value: number) => value.toLocaleString("es");

/** Cuentas a las que da acceso una api_key. Solo para proveedores con `accountLookup`. */
async function findAccounts(provider: ProviderId, apiKey: string): Promise<ProviderAccount[]> {
  switch (provider) {
    case "pancake":
      return listPancakeShops(apiKey);
    default:
      return [];
  }
}

type CheckResult = { ok: true; message: string; accountName: string | null } | { ok: false; message: string };

/** Prueba la conexión con las credenciales guardadas y registra el resultado en la tabla. */
async function checkConnection(id: string): Promise<CheckResult> {
  const row = await db.integration.findUnique({
    where: { id },
    select: { provider: true, externalId: true, apiKey: true, apiSecret: true, accessToken: true, tokenExpiresAt: true },
  });
  if (!row) return { ok: false, message: "La integración ya no existe." };
  if (!row.apiKey || !row.externalId) return { ok: false, message: "Faltan credenciales: edita la integración." };

  try {
    let result: CheckResult;
    switch (row.provider) {
      case "pancake": {
        const { totalOrders } = await testPancakeConnection({ shopId: row.externalId, apiKey: row.apiKey });
        const orders = totalOrders === null ? "" : ` La tienda tiene ${count(totalOrders)} órdenes.`;
        result = { ok: true, message: `Conexión verificada con Pancake POS.${orders}`, accountName: null };
        break;
      }
      case "shopify": {
        const { shop, totalOrders, exact } = await testShopifyConnection({
          integrationId: id,
          shopDomain: row.externalId,
          apiKey: row.apiKey,
          clientSecret: row.apiSecret,
          accessToken: row.accessToken,
          tokenExpiresAt: row.tokenExpiresAt,
        });
        const orders = totalOrders === null ? "" : ` La tienda tiene ${exact ? "" : "más de "}${count(totalOrders)} pedidos.`;
        result = { ok: true, message: `Conexión verificada con Shopify (${shop.name}).${orders}`, accountName: shop.name };
        break;
      }
      default:
        return { ok: false, message: "Proveedor sin prueba de conexión." };
    }
    await recordIntegrationResult(id, { ok: true });
    return result;
  } catch (error) {
    const message = providerMessage(error, "No se pudo verificar la conexión.");
    await recordIntegrationResult(id, { ok: false, error: message });
    return { ok: false, message };
  }
}

/**
 * Busca las cuentas (tiendas) de una api_key para que el usuario no tenga que buscar el Shop ID.
 * Al editar, si el campo de clave viene vacío, usa la clave guardada de esa conexión.
 */
export async function lookupAccountsAction(input: {
  provider: string;
  apiKey: string;
  integrationId?: string | null;
}): Promise<AccountLookupResult> {
  const auth = await authorize(input.integrationId ? PERMISSIONS.INTEGRATIONS_UPDATE : PERMISSIONS.INTEGRATIONS_CREATE);
  if (!auth.ok) return { ok: false, message: auth.message };
  if (!isProviderId(input.provider) || !PROVIDERS[input.provider].accountLookup) {
    return { ok: false, message: "Este servicio no permite buscar cuentas." };
  }
  const provider = PROVIDERS[input.provider];

  let apiKey = String(input.apiKey ?? "").trim().slice(0, 500);
  if (!apiKey && input.integrationId) {
    const stored = await db.integration.findUnique({ where: { id: input.integrationId }, select: { provider: true, apiKey: true } });
    if (stored?.provider === provider.id) apiKey = stored.apiKey ?? "";
  }
  if (!apiKey) return { ok: false, message: `Pega primero la ${provider.apiKey.label}.` };

  try {
    return { ok: true, accounts: await findAccounts(provider.id, apiKey) };
  } catch (error) {
    return { ok: false, message: providerMessage(error, `No se pudo consultar a ${provider.name}.`) };
  }
}

export async function saveIntegrationAction(
  _previous: ActionResult<IntegrationField>,
  formData: FormData,
): Promise<ActionResult<IntegrationField>> {
  const id = String(formData.get("id") ?? "") || null;
  const auth = await authorize(id ? PERMISSIONS.INTEGRATIONS_UPDATE : PERMISSIONS.INTEGRATIONS_CREATE);
  if (!auth.ok) return { ok: false, message: auth.message };

  const parsed = integrationSchema.safeParse({
    provider: formData.get("provider") ?? "",
    name: formData.get("name") ?? "",
    externalId: formData.get("externalId") ?? "",
    apiKey: formData.get("apiKey") ?? "",
    apiSecret: formData.get("apiSecret") ?? "",
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const { apiKey, apiSecret, active } = parsed.data;
  const provider = PROVIDERS[parsed.data.provider as ProviderId];
  let name = parsed.data.name;
  let externalId = parsed.data.externalId ? provider.externalId.normalize(parsed.data.externalId) : "";
  // Shopify con dominio propio (mitienda.com): se averigua su dominio .myshopify.com.
  let customDomain: string | null = null;
  if (provider.id === "shopify" && externalId && !provider.externalId.pattern.test(externalId)) {
    try {
      const resolved = await resolveShopifyDomain(externalId);
      externalId = resolved.domain;
      customDomain = resolved.customDomain;
      name ||= resolved.name ?? "";
    } catch (error) {
      return { ok: false, fieldErrors: { externalId: providerMessage(error, provider.externalId.patternError) } };
    }
  }
  if (externalId && !provider.externalId.pattern.test(externalId)) {
    return { ok: false, fieldErrors: { externalId: provider.externalId.patternError } };
  }

  const current = id
    ? await db.integration.findUnique({ where: { id }, select: { provider: true, externalId: true, apiKey: true, apiSecret: true } })
    : null;
  if (id && (!current || current.provider !== provider.id)) return { ok: false, message: "La integración ya no existe." };
  if (!id && !apiKey) return { ok: false, fieldErrors: { apiKey: `Pega el ${provider.apiKey.label} de tu cuenta.` } };

  // Secret obligatorio salvo que la credencial principal no lo necesite (p. ej. token shpat_).
  const effectiveKey = apiKey || current?.apiKey || "";
  if (provider.apiSecret && !apiSecret && !current?.apiSecret && !provider.apiSecret.notNeededFor?.(effectiveKey)) {
    return { ok: false, fieldErrors: { apiSecret: `Pega el ${provider.apiSecret.label} de la app.` } };
  }

  // Sin identificador: se averigua con la api_key (si da acceso a una sola cuenta, se usa esa).
  if (!externalId) {
    if (!provider.accountLookup || !effectiveKey) {
      return { ok: false, fieldErrors: { externalId: `Ingresa el ${provider.externalId.label.toLowerCase()}.` } };
    }
    const { noun, nounPlural, button } = provider.accountLookup;
    let accounts: ProviderAccount[];
    try {
      accounts = await findAccounts(provider.id, effectiveKey);
    } catch (error) {
      return { ok: false, fieldErrors: { apiKey: providerMessage(error, `No se pudo consultar a ${provider.name}.`) } };
    }
    if (accounts.length === 0) {
      return { ok: false, fieldErrors: { externalId: `Esta ${provider.apiKey.label} no tiene ${nounPlural} asociadas.` } };
    }
    if (accounts.length > 1) {
      return {
        ok: false,
        fieldErrors: { externalId: `La ${provider.apiKey.label} da acceso a ${accounts.length} ${nounPlural}: pulsa «${button}» y elige una ${noun}.` },
      };
    }
    externalId = accounts[0].id;
    name ||= accounts[0].name;
  }
  // Sin nombre: uno provisional que se cambia por el de la tienda si la prueba lo devuelve.
  const autoName = !name;
  name ||= `${provider.name} ${externalId}`;

  try {
    let savedId: string;
    if (id && current) {
      const credentialsChanged = Boolean(apiKey || apiSecret) || current.externalId !== externalId;
      await db.integration.update({
        where: { id },
        data: {
          name,
          externalId,
          active,
          ...(apiKey && { apiKey }),
          ...(apiSecret && { apiSecret }),
          // Credenciales nuevas: se descarta el token guardado y vuelve a "pendiente" hasta probarlas.
          ...(credentialsChanged && { status: "PENDING", lastError: null, accessToken: null, tokenExpiresAt: null }),
        },
      });
      savedId = id;
    } else {
      const created = await db.integration.create({
        data: { provider: provider.id, name, externalId, apiKey, apiSecret: apiSecret || null, active, createdById: auth.user.id },
        select: { id: true },
      });
      savedId = created.id;
    }

    // Al guardar se prueba la conexión para que el usuario sepa en el acto si las credenciales sirven.
    const verb = id ? "Se actualizó" : "Se conectó";
    if (!active) {
      refresh();
      return { ok: true, message: `${verb} ${name} (inactiva).${customDomain ? ` ${customDomain} corresponde a ${externalId}.` : ""}` };
    }
    const check = await checkConnection(savedId);
    if (check.ok && autoName && check.accountName) {
      name = check.accountName;
      await db.integration.update({ where: { id: savedId }, data: { name } });
    }
    refresh();
    const domainNote = customDomain ? ` ${customDomain} corresponde a ${externalId}.` : "";
    return check.ok
      ? { ok: true, message: `${verb} ${name}.${domainNote} ${check.message}` }
      : { ok: true, warning: true, message: `Se guardó ${name},${domainNote ? `${domainNote.slice(0, -1)},` : ""} pero la prueba con ${provider.name} falló: ${check.message}` };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, fieldErrors: { externalId: "Esta cuenta ya está conectada." } };
    if (isNotFound(error)) return { ok: false, message: "La integración ya no existe." };
    throw error;
  }
}

export async function testIntegrationAction(id: string): Promise<ActionResult> {
  const auth = await authorize(PERMISSIONS.INTEGRATIONS_SYNC);
  if (!auth.ok) return { ok: false, message: auth.message };

  const result = await checkConnection(id);
  refresh();
  return result;
}

export async function deleteIntegrationAction(id: string): Promise<ActionResult> {
  const auth = await authorize(PERMISSIONS.INTEGRATIONS_DELETE);
  if (!auth.ok) return { ok: false, message: auth.message };

  try {
    const deleted = await db.integration.delete({ where: { id }, select: { name: true } });
    refresh();
    return { ok: true, message: `Se eliminó la integración ${deleted.name} y sus credenciales.` };
  } catch (error) {
    if (isNotFound(error)) return { ok: false, message: "La integración ya no existe." };
    throw error;
  }
}
