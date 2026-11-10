/**
 * MOCK — datos de ejemplo del dashboard. Reemplazar por llamadas a la API.
 * Son deterministas a propósito (sin Math.random/Date) para que el prerender sea estable,
 * y los números ya vienen formateados para no depender del locale del servidor.
 */

export type Range = "7d" | "30d" | "12m";

export const ranges: { id: Range; label: string; caption: string }[] = [
  { id: "7d", label: "7 días", caption: "Últimos 7 días" },
  { id: "30d", label: "30 días", caption: "Últimos 30 días" },
  { id: "12m", label: "12 meses", caption: "Últimos 12 meses" },
];

/** Serie de color del tema (1–4 → --app-chart-N). */
export type KpiTone = 1 | 2 | 3 | 4;

export type Kpi = {
  id: string;
  label: string;
  tone: KpiTone;
  value: string;
  delta: number;
  deltaLabel: string;
  series: number[];
};

type KpiSeed = Omit<Kpi, "value" | "delta" | "deltaLabel" | "series">;

const KPI_SEEDS: KpiSeed[] = [
  { id: "revenue", label: "Ingresos", tone: 1 },
  { id: "orders", label: "Pedidos", tone: 2 },
  { id: "customers", label: "Clientes nuevos", tone: 3 },
  { id: "ticket", label: "Ticket promedio", tone: 4 },
];

const KPI_VALUES: Record<Range, Pick<Kpi, "value" | "delta" | "deltaLabel" | "series">[]> = {
  "7d": [
    { value: "$18.420", delta: 8.2, deltaLabel: "+8,2%", series: [12, 15, 13, 18, 17, 21, 24] },
    { value: "312", delta: 5.1, deltaLabel: "+5,1%", series: [38, 41, 40, 47, 44, 49, 53] },
    { value: "48", delta: -3.4, deltaLabel: "−3,4%", series: [9, 8, 7, 8, 6, 5, 5] },
    { value: "$59,0", delta: 2.9, deltaLabel: "+2,9%", series: [56, 57, 57, 58, 58, 59, 59] },
  ],
  "30d": [
    { value: "$76.950", delta: 12.6, deltaLabel: "+12,6%", series: [58, 62, 60, 69, 72, 70, 78, 84] },
    { value: "1.284", delta: 9.8, deltaLabel: "+9,8%", series: [140, 151, 149, 160, 158, 170, 172, 184] },
    { value: "196", delta: 4.2, deltaLabel: "+4,2%", series: [21, 24, 22, 25, 26, 24, 27, 27] },
    { value: "$59,9", delta: 2.6, deltaLabel: "+2,6%", series: [57, 58, 58, 59, 59, 60, 60, 60] },
  ],
  "12m": [
    { value: "$842.300", delta: 21.4, deltaLabel: "+21,4%", series: [52, 55, 58, 57, 63, 66, 70, 69, 74, 79, 83, 88] },
    { value: "14.120", delta: 17.9, deltaLabel: "+17,9%", series: [920, 980, 1010, 1050, 1090, 1130, 1180, 1200, 1240, 1290, 1340, 1370] },
    { value: "2.310", delta: 11.2, deltaLabel: "+11,2%", series: [160, 168, 171, 175, 182, 186, 190, 195, 198, 204, 209, 214] },
    { value: "$59,6", delta: -1.1, deltaLabel: "−1,1%", series: [61, 61, 60, 60, 60, 59, 59, 60, 59, 59, 59, 60] },
  ],
};

export const getKpis = (range: Range): Kpi[] => KPI_SEEDS.map((seed, index) => ({ ...seed, ...KPI_VALUES[range][index] }));

/** Ingresos vs. meta, en miles. */
export const revenueSeries: Record<Range, { labels: string[]; revenue: number[]; target: number[] }> = {
  "7d": {
    labels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    revenue: [2.1, 2.4, 2.2, 2.9, 3.4, 3.1, 2.3],
    target: [2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5],
  },
  "30d": {
    labels: ["Sem 1", "Sem 2", "Sem 3", "Sem 4"],
    revenue: [16.8, 18.2, 19.9, 22.0],
    target: [18, 18, 18, 18],
  },
  "12m": {
    labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
    revenue: [52, 55, 61, 58, 66, 70, 74, 71, 78, 82, 86, 89],
    target: [60, 60, 60, 65, 65, 65, 70, 70, 70, 75, 75, 75],
  },
};

export const channels = [
  { label: "Tienda online", value: 46 },
  { label: "Marketplace", value: 27 },
  { label: "Punto de venta", value: 18 },
  { label: "Redes sociales", value: 9 },
];

import type { OrderStatus } from "@/lib/orders";

export type { OrderStatus };

export type Order = {
  id: string;
  customer: string;
  email: string;
  date: string;
  amount: string;
  status: OrderStatus;
};

export const recentOrders: Order[] = [
  { id: "CA-1048", customer: "Laura Gómez", email: "laura@ejemplo.com", date: "Hoy, 10:24", amount: "$184,00", status: "Pagado" },
  { id: "CA-1047", customer: "Carlos Pérez", email: "carlos@ejemplo.com", date: "Hoy, 09:12", amount: "$62,50", status: "Pendiente" },
  { id: "CA-1046", customer: "Ana Torres", email: "ana@ejemplo.com", date: "Ayer, 18:40", amount: "$249,90", status: "Enviado" },
  { id: "CA-1045", customer: "Diego Ramírez", email: "diego@ejemplo.com", date: "Ayer, 16:05", amount: "$38,00", status: "Cancelado" },
  { id: "CA-1044", customer: "Sofía Herrera", email: "sofia@ejemplo.com", date: "Ayer, 11:47", amount: "$129,00", status: "Pagado" },
];

export type ActivityKind = "order" | "customer" | "shipping" | "alert";

export const activity: { id: string; kind: ActivityKind; text: string; time: string }[] = [
  { id: "a1", kind: "order", text: "Nuevo pedido #CA-1048 por $184,00", time: "Hace 12 min" },
  { id: "a2", kind: "customer", text: "Se registró un cliente desde la tienda online", time: "Hace 40 min" },
  { id: "a3", kind: "shipping", text: "El pedido #CA-1046 salió a reparto", time: "Hace 2 h" },
  { id: "a4", kind: "alert", text: "Stock bajo en 3 productos del catálogo", time: "Hace 5 h" },
  { id: "a5", kind: "order", text: "Se reembolsó el pedido #CA-1045", time: "Ayer" },
];
