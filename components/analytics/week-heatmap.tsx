"use client";

import { useState, type KeyboardEvent } from "react";
import { hourLabel, integer, WEEKDAYS_LONG, WEEKDAYS_SHORT } from "./format";

/** Filas de lunes a domingo (índices de Date: 0 = domingo). */
const ROWS = [1, 2, 3, 4, 5, 6, 0];
const STEPS = 6;

type Cell = { weekday: number; hour: number };

function describe(cell: Cell, value: number) {
  const pedidos = value === 1 ? "1 pedido" : `${integer(value)} pedidos`;
  const day = WEEKDAYS_LONG[cell.weekday];
  return `${day.charAt(0).toUpperCase()}${day.slice(1)}, ${hourLabel(cell.hour)} – ${hourLabel((cell.hour + 1) % 24)}: ${pedidos}`;
}

/**
 * Mapa de calor día × hora (secuencial, un solo tono). El cursor o el teclado (flechas)
 * muestran el detalle en la línea superior; la vista de tabla tiene todas las cifras.
 */
export function WeekHeatmap({ matrix, timezone }: { matrix: number[][]; timezone: string }) {
  const max = Math.max(...matrix.flat(), 0);
  const [active, setActive] = useState<Cell | null>(null);
  const [focus, setFocus] = useState<Cell>({ weekday: 1, hour: 12 });

  let peak: (Cell & { value: number }) | null = null;
  for (const weekday of ROWS) {
    for (let hour = 0; hour < 24; hour++) {
      const value = matrix[weekday][hour];
      if (value > 0 && (!peak || value > peak.value)) peak = { weekday, hour, value };
    }
  }

  const step = (value: number) => (value === 0 || max === 0 ? 0 : Math.min(STEPS, Math.ceil((value / max) * STEPS)));

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    const row = (ROWS.indexOf(focus.weekday) + move[0] + 7) % 7;
    const next = { weekday: ROWS[row], hour: (focus.hour + move[1] + 24) % 24 };
    setFocus(next);
    setActive(next);
    document.getElementById(`heat-${next.weekday}-${next.hour}`)?.focus();
  }

  const shown = active ?? null;

  return (
    <div className="heatmap">
      <p className="heatmap__readout" aria-live="polite">
        {shown ? (
          <>
            <strong>{describe(shown, matrix[shown.weekday][shown.hour])}</strong>
          </>
        ) : peak ? (
          <>
            Mejor momento: <strong>{WEEKDAYS_LONG[peak.weekday]} {hourLabel(peak.hour)}</strong> ({integer(peak.value)}{" "}
            {peak.value === 1 ? "pedido" : "pedidos"}). Pasa el cursor por una celda para ver su detalle.
          </>
        ) : (
          "Sin pedidos en el período."
        )}
      </p>
      <div className="heatmap__scroll">
        <div className="heatmap__grid" role="grid" aria-label={`Pedidos por día y hora (horario ${timezone})`} onKeyDown={onKeyDown} onMouseLeave={() => setActive(null)}>
          <div className="heatmap__row" role="row">
            <div className="heatmap__corner" role="presentation" />
            {Array.from({ length: 24 }, (_, hour) => (
              <div key={hour} className="heatmap__hour" role="columnheader" aria-label={hourLabel(hour)}>
                {hour % 3 === 0 ? hour : ""}
              </div>
            ))}
          </div>
          {ROWS.map((weekday) => (
            <div key={weekday} className="heatmap__row" role="row">
              <div className="heatmap__day" role="rowheader">
                {WEEKDAYS_SHORT[weekday]}
              </div>
              {Array.from({ length: 24 }, (_, hour) => {
                const value = matrix[weekday][hour];
                const isFocus = focus.weekday === weekday && focus.hour === hour;
                const isActive = shown?.weekday === weekday && shown?.hour === hour;
                return (
                  <div
                    key={hour}
                    id={`heat-${weekday}-${hour}`}
                    role="gridcell"
                    tabIndex={isFocus ? 0 : -1}
                    aria-label={describe({ weekday, hour }, value)}
                    className={`heatmap__cell step-${step(value)} ${isActive ? "is-active" : ""}`}
                    onMouseEnter={() => setActive({ weekday, hour })}
                    onFocus={() => {
                      setFocus({ weekday, hour });
                      setActive({ weekday, hour });
                    }}
                    onBlur={() => setActive(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="heatmap__legend" aria-hidden="true">
        <span>Menos</span>
        {Array.from({ length: STEPS + 1 }, (_, index) => (
          <span key={index} className={`heatmap__swatch step-${index}`} />
        ))}
        <span>Más</span>
        <span className="heatmap__tz">Horario de la tienda ({timezone})</span>
      </div>
    </div>
  );
}
