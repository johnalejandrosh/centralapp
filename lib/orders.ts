/**
 * Forma de orden que usa la aplicación. Las integraciones (Pancake POS, etc.) traducen
 * sus propios formatos a estos tipos para que el dashboard y los reportes no dependan
 * de ningún proveedor. Compartido entre cliente y servidor.
 */

/** Estados que muestra la app (p. ej. la tarjeta "Pedidos recientes" del resumen). */
export type OrderStatus = "Pagado" | "Enviado" | "Pendiente" | "Cancelado";

export type AppOrderItem = {
  productId: string;
  variationId: string | null;
  name: string;
  sku: string | null;
  quantity: number;
  /** Precio de lista por unidad. */
  unitPrice: number;
  /** Parte del total cobrado que corresponde a este ítem (ya con descuentos). */
  revenue: number;
};

export type AppOrder = {
  /** ID en el sistema de origen. */
  id: string;
  /** Proveedor del que viene la orden (id del catálogo de integraciones). */
  provider: string;
  /** Código visible para el equipo (p. ej. el número de pedido de Pancake). */
  code: string;
  customer: string;
  phone: string | null;
  /** Fecha de creación en ISO 8601 (UTC). */
  date: string;
  /** Total cobrado al cliente, ya con descuentos. */
  amount: number;
  shippingFee: number;
  status: OrderStatus;
  /** Estado original del proveedor, por si hace falta más detalle que `status`. */
  statusCode: number | null;
  statusName: string;
  /** `false` en canceladas, eliminadas o devueltas: no cuentan como venta ni para el CPA. */
  countsAsSale: boolean;
  items: AppOrderItem[];
  /** Datos de origen de la venta, útiles para atribuirla a una campaña. */
  attribution: {
    channel: string | null;
    adId: string | null;
    campaign: string | null;
  };
};
