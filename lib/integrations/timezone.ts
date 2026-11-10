/**
 * Fechas en la zona horaria de la tienda (IANA, p. ej. "America/Bogota") sin librerías.
 * Un "día" es un texto YYYY-MM-DD en esa zona; sumar o restar días es aritmética de calendario.
 * Compartido entre cliente y servidor.
 */

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number; weekday: number };

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string) {
  let value = formatters.get(timeZone);
  if (!value) {
    value = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    formatters.set(timeZone, value);
  }
  return value;
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Fecha y hora de un instante vistas en `timeZone`. `weekday`: 0 = domingo. */
export function zonedParts(date: Date, timeZone: string): Parts {
  const parts: Record<string, string> = {};
  for (const part of formatter(timeZone).formatToParts(date)) parts[part.type] = part.value;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAYS[parts.weekday] ?? 0,
  };
}

const pad = (value: number) => String(value).padStart(2, "0");

/** Día (YYYY-MM-DD) de un instante en `timeZone`. */
export function localDay(date: Date, timeZone: string) {
  const { year, month, day } = zonedParts(date, timeZone);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Desfase de `timeZone` respecto a UTC en ese instante, en milisegundos. */
function offsetMs(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(date.getTime() / 1000) * 1000;
}

/** Instante UTC en que empieza el día `day` (00:00) en `timeZone`. */
export function startOfDay(day: string, timeZone: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  const guess = Date.UTC(year, month - 1, date);
  const first = guess - offsetMs(new Date(guess), timeZone);
  // Segundo paso por si el desfase cambia ese día (horario de verano).
  return new Date(guess - offsetMs(new Date(first), timeZone));
}

/** Suma `amount` días de calendario a un día YYYY-MM-DD. */
export function addDays(day: string, amount: number) {
  const [year, month, date] = day.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, date + amount));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

/** Días entre `from` y `to`, ambos incluidos. */
export function dayCount(from: string, to: string) {
  const toUtc = (day: string) => {
    const [year, month, date] = day.split("-").map(Number);
    return Date.UTC(year, month - 1, date);
  };
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000) + 1;
}

/** Lista de días de `from` a `to`, ambos incluidos. */
export function dayRange(from: string, to: string) {
  return Array.from({ length: Math.max(0, dayCount(from, to)) }, (_, index) => addDays(from, index));
}

/** Día de la semana de un día YYYY-MM-DD (0 = domingo). */
export function weekdayOf(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date)).getUTCDay();
}

export const isDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
