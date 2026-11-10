"use client";

import { useState, type ReactNode } from "react";

type ChartCardProps = {
  title: string;
  subtitle?: ReactNode;
  /** Controles de vista propios de la gráfica (p. ej. la métrica); los filtros van arriba. */
  actions?: ReactNode;
  /** Versión en tabla de los mismos datos (accesible y para leer cifras exactas). */
  table?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Tarjeta de gráfica con su alternativa en tabla. */
export function ChartCard({ title, subtitle, actions, table, children, className = "" }: ChartCardProps) {
  const [showTable, setShowTable] = useState(false);

  return (
    <section className={`card viz-card ${className}`} aria-label={title}>
      <div className="card-body d-flex flex-column">
        <header className="viz-card__head">
          <div className="min-w-0">
            <h2 className="viz-card__title">{title}</h2>
            {subtitle && <p className="viz-card__subtitle">{subtitle}</p>}
          </div>
          <div className="viz-card__actions">
            {actions}
            {table && (
              <button
                type="button"
                className={`viz-toggle ${showTable ? "is-active" : ""}`}
                aria-pressed={showTable}
                onClick={() => setShowTable((value) => !value)}
              >
                {showTable ? "Gráfica" : "Tabla"}
              </button>
            )}
          </div>
        </header>
        <div className="viz-card__body">{showTable && table ? <div className="viz-table-wrap">{table}</div> : children}</div>
      </div>
    </section>
  );
}

/** Grupo de botones segmentado para cambiar la vista de una gráfica (métrica, pestaña). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="viz-segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === value ? "is-active" : ""}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Mensaje cuando una gráfica no tiene datos con los filtros actuales. */
export function EmptyChart({ children }: { children: ReactNode }) {
  return <div className="viz-empty">{children}</div>;
}
