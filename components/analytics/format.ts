/** Formatos del tablero (moneda de la tienda, cifras compactas, fechas en la zona de la tienda). */

const cache = new Map<string, Intl.NumberFormat>();

function numberFormat(key: string, options: Intl.NumberFormatOptions) {
  let value = cache.get(key);
  if (!value) {
    value = new Intl.NumberFormat("es-CO", options);
    cache.set(key, value);
  }
  return value;
}

/** $ 22.319.404 */
export const money = (value: number, currency: string) =>
  numberFormat(`money-${currency}`, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);

/** $22,3 M · $540 K · $9.800 (compacta desde 10.000). */
export const moneyCompact = (value: number, currency: string) =>
  Math.abs(value) < 10_000
    ? money(value, currency)
    : numberFormat(`money-compact-${currency}`, {
        style: "currency",
        currency,
        notation: "compact",
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }).format(value);

export const integer = (value: number) => numberFormat("int", { maximumFractionDigits: 0 }).format(value);

export const compact = (value: number) =>
  Math.abs(value) < 10_000 ? integer(value) : numberFormat("compact", { notation: "compact", maximumFractionDigits: 1 }).format(value);

/** 0,914 → "+91,4 %" */
export const signedPercent = (value: number) =>
  numberFormat("signed-pct", { style: "percent", minimumFractionDigits: 0, maximumFractionDigits: 1, signDisplay: "exceptZero" }).format(value);

export const percent = (value: number) => numberFormat("pct", { style: "percent", minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(value);

const dates = new Map<string, Intl.DateTimeFormat>();
function dateFormat(key: string, options: Intl.DateTimeFormatOptions) {
  let value = dates.get(key);
  if (!value) {
    value = new Intl.DateTimeFormat("es-CO", options);
    dates.set(key, value);
  }
  return value;
}

/** Día YYYY-MM-DD como etiqueta corta ("7 nov"). Se formatea en UTC para no correr el día. */
export const dayLabel = (day: string) => dateFormat("day", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`)).replace(" de ", " ");

/** "sáb, 7 nov" */
export const dayLabelLong = (day: string) =>
  dateFormat("day-long", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`)).replace(" de ", " ");

/** "7 nov – 13 nov" */
export const rangeLabel = (range: { from: string; to: string }) => `${dayLabel(range.from)} – ${dayLabel(range.to)}`;

/** Fecha y hora de un instante en la zona de la tienda ("8 nov, 7:21 a. m."). */
export const dateTimeIn = (iso: string, timeZone: string) =>
  dateFormat(`dt-${timeZone}`, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone })
    .format(new Date(iso))
    .replace(" de ", " ");

/** "7:52 a. m." en la zona de la tienda. */
export const timeIn = (iso: string, timeZone: string) => dateFormat(`t-${timeZone}`, { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(iso));

/** 6 → "6 a. m." */
export const hourLabel = (hour: number) =>
  dateFormat("hour", { hour: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 0, 1, hour)));

export const WEEKDAYS_LONG = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const WEEKDAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
