"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

function format(iso: string, withTime: boolean, timeZone?: string) {
  return new Intl.DateTimeFormat("es", {
    dateStyle: withTime ? "medium" : "long",
    timeStyle: withTime ? "short" : undefined,
    timeZone,
  }).format(new Date(iso));
}

/**
 * Fecha en la zona horaria del navegador. En el servidor se pinta en UTC y, al hidratar,
 * React cambia al valor local sin error de hidratación (patrón de useSyncExternalStore).
 */
export function LocalDate({
  iso,
  fallback = "—",
  withTime = true,
}: {
  iso: string | null;
  fallback?: string;
  /** `false` muestra solo la fecha, en formato largo ("7 de noviembre de 2026"). */
  withTime?: boolean;
}) {
  const text = useSyncExternalStore(
    noopSubscribe,
    () => (iso ? format(iso, withTime) : fallback),
    () => (iso ? format(iso, withTime, "UTC") : fallback),
  );
  return iso ? <time dateTime={iso}>{text}</time> : <span className="text-body-tertiary">{text}</span>;
}
