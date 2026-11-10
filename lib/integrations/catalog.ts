/**
 * Catálogo de integraciones disponibles. Compartido entre cliente y servidor:
 * aquí solo va información pública (textos, etiquetas de campos, rutas, validaciones).
 * Para sumar un proveedor nuevo: agrégalo aquí, crea su cliente en lib/server/integrations/,
 * su Route Handler de órdenes en app/api/<proveedor>/orders/ y su página en
 * app/(dashboard)/dashboard/integraciones/<proveedor>/.
 */

export type ProviderId = "pancake" | "shopify";

export type IntegrationProvider = {
  id: ProviderId;
  name: string;
  /** Frase corta para la tarjeta del catálogo. */
  tagline: string;
  /** Página con las conexiones de este proveedor. */
  href: string;
  /** Endpoint interno (Route Handler) que devuelve sus órdenes normalizadas. */
  ordersEndpoint: string;
  /** Texto corto en la tarjeta (2 o 3 letras) mientras no haya logo propio. */
  monogram: string;
  /** Qué identifica la cuenta en el proveedor (se guarda en `integrations.external_id`). */
  externalId: {
    label: string;
    placeholder: string;
    help: string;
    inputMode: "numeric" | "url";
    /** Limpia lo que pega el usuario (URL completa, mayúsculas, etc.). */
    normalize: (value: string) => string;
    pattern: RegExp;
    patternError: string;
  };
  /** Credencial principal (se guarda en `integrations.api_key`). */
  apiKey: { label: string; help: string };
  /** Credencial secundaria (se guarda en `integrations.api_secret`). */
  apiSecret?: {
    label: string;
    help: string;
    /** `true` si con esta credencial principal no hace falta el secret. */
    notNeededFor?: (apiKey: string) => boolean;
  };
  /** Si el proveedor permite listar las cuentas de una credencial (completa `externalId` solo). */
  accountLookup?: { button: string; noun: string; nounPlural: string };
  /** Pasos para conseguir las credenciales; se muestran en el formulario de conexión. */
  setupSteps: string[];
  /** Resumen de lo que se puede sincronizar, para la tarjeta del catálogo. */
  syncs: string[];
};

/** Token fijo de una app personalizada de Shopify creada en el admin antes de 2026. */
export function isStaticShopifyToken(value: string) {
  return /^shp(at|ca)_/.test(value.trim());
}

/**
 * Acepta "mitienda", "mitienda.myshopify.com", "https://mitienda.myshopify.com/admin"
 * o "admin.shopify.com/store/mitienda" y devuelve "mitienda.myshopify.com".
 */
export function normalizeShopifyDomain(value: string) {
  const clean = value.trim().toLowerCase().replace(/^https?:\/\//, "");
  const adminUrl = clean.match(/^admin\.shopify\.com\/store\/([a-z0-9][a-z0-9-]*)/);
  if (adminUrl) return `${adminUrl[1]}.myshopify.com`;
  const host = clean.split(/[/?#]/)[0];
  return host && !host.includes(".") ? `${host}.myshopify.com` : host;
}

export const PROVIDERS: Record<ProviderId, IntegrationProvider> = {
  pancake: {
    id: "pancake",
    name: "Pancake POS",
    tagline: "Órdenes, productos y clientes de tu tienda para medir el CPA real de la pauta.",
    href: "/dashboard/integraciones/pancake",
    ordersEndpoint: "/api/pancake/orders",
    monogram: "POS",
    externalId: {
      label: "Shop ID",
      placeholder: "Ej. 1234567",
      help: "Se completa solo al buscar con tu API key. También aparece en la URL del panel de Pancake POS, después de /shop/.",
      inputMode: "numeric",
      normalize: (value) => value.trim(),
      pattern: /^\d+$/,
      patternError: "El Shop ID es un número.",
    },
    apiKey: {
      label: "API key",
      help: "Se crea en Pancake POS → Configuración → Configuración de la aplicación → API KEY → Agregar. Al pegarla, CentralApp busca tus tiendas.",
    },
    accountLookup: { button: "Buscar tienda", noun: "tienda", nounPlural: "tiendas" },
    setupSteps: [
      "En Pancake POS entra a Configuración → Configuración de la aplicación → API KEY y pulsa Agregar.",
      "Copia la clave y pégala aquí: CentralApp encuentra la tienda y completa el Shop ID.",
    ],
    syncs: ["Órdenes y estados", "Productos y variantes", "Clientes", "Origen de la venta (anuncio, UTM)"],
  },
  shopify: {
    id: "shopify",
    name: "Shopify",
    tagline: "Pedidos de tu tienda online, con su estado de pago y envío, para medir el CPA real de la pauta.",
    href: "/dashboard/integraciones/shopify",
    ordersEndpoint: "/api/shopify/orders",
    monogram: "SH",
    externalId: {
      label: "Dominio de la tienda",
      placeholder: "mitienda.com o mitienda.myshopify.com",
      help: "Sirve tu dominio propio (p. ej. mitienda.com): al guardar, CentralApp encuentra su dominio .myshopify.com. También puedes pegar la URL del admin.",
      inputMode: "url",
      normalize: normalizeShopifyDomain,
      pattern: /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/,
      patternError: "Escribe el dominio de tu tienda, p. ej. mitienda.com o mitienda.myshopify.com.",
    },
    apiKey: {
      label: "Client ID",
      help: "Dev Dashboard → tu app → Settings. Si tu tienda ya tiene una app personalizada antigua, puedes pegar aquí su token shpat_.",
    },
    apiSecret: {
      label: "Client secret",
      help: "Dev Dashboard → tu app → Settings → Client secret. No hace falta si usas un token shpat_.",
      notNeededFor: isStaticShopifyToken,
    },
    setupSteps: [
      "Con la cuenta dueña de la tienda, entra al Dev Dashboard de Shopify (dev.shopify.com) y crea una app.",
      "En la versión de la app elige los permisos read_orders y read_products (agrega read_all_orders si quieres pedidos de más de 60 días) y publica la versión.",
      "Instala la app en tu tienda.",
      "En Settings de la app copia el Client ID y el Client secret y pégalos aquí junto con el dominio de tu tienda (sirve tu dominio propio).",
    ],
    syncs: ["Pedidos y estado de pago y envío", "Productos y SKU", "Origen de la visita (UTM)"],
  },
};

export const PROVIDER_LIST: IntegrationProvider[] = Object.values(PROVIDERS);

export function isProviderId(value: string): value is ProviderId {
  return Object.hasOwn(PROVIDERS, value);
}
