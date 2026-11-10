"use client";

export type RankedItem = {
  key: string;
  label: string;
  value: number;
  /** Cifra visible al final de la barra. */
  display: string;
  /** Dato secundario bajo el nombre (p. ej. "38 pedidos · 24 %"). */
  detail?: string;
};

type RankedBarsProps = {
  items: RankedItem[];
  label: string;
  /** Elemento resaltado (filtro activo): el resto pasa a gris. */
  selected?: string | null;
  /** Si se indica, cada fila es un botón que filtra el tablero. */
  onSelect?: (key: string | null) => void;
  /** Máximo de filas; el resto se agrupa en "Otros" (no se puede filtrar). */
  max?: number;
  /** Mantiene el orden recibido (p. ej. estados) en vez de ordenar por valor. */
  keepOrder?: boolean;
  /** "stacked": nombre completo arriba y barra a todo el ancho (para nombres largos). */
  layout?: "inline" | "stacked";
};

/** Barras horizontales clasificadas, un solo color, con la cifra al final de cada barra. */
export function RankedBars({ items, label, selected = null, onSelect, max = 8, keepOrder = false, layout = "inline" }: RankedBarsProps) {
  const sorted = keepOrder ? items : [...items].sort((a, b) => b.value - a.value);
  let rows = sorted;
  if (sorted.length > max) {
    const rest = sorted.slice(max - 1);
    rows = [
      ...sorted.slice(0, max - 1),
      {
        key: "__otros",
        label: `Otros (${rest.length})`,
        value: rest.reduce((sum, item) => sum + item.value, 0),
        display: "",
        detail: undefined,
      },
    ];
  }
  const top = Math.max(...rows.map((row) => row.value), 0) || 1;

  return (
    <ul className={`ranked ranked--${layout} ${selected ? "has-selection" : ""}`} aria-label={label}>
      {rows.map((row) => {
        const width = `${Math.max(row.value > 0 ? 1.5 : 0, (row.value / top) * 100)}%`;
        const isSelected = selected === row.key;
        const clickable = Boolean(onSelect) && row.key !== "__otros";
        const content = (
          <>
            <span className="ranked__label" title={row.label}>
              <span className="ranked__name">{row.label}</span>
              {row.detail && <span className="ranked__detail">{row.detail}</span>}
            </span>
            <span className="ranked__track" aria-hidden="true">
              <span className="ranked__bar" style={{ width }} />
            </span>
            <span className="ranked__value">{row.display || null}</span>
          </>
        );
        return (
          <li key={row.key} className={`ranked__row ${isSelected ? "is-selected" : ""}`}>
            {clickable ? (
              <button
                type="button"
                className="ranked__hit"
                aria-pressed={isSelected}
                title={isSelected ? "Quitar filtro" : `Filtrar el tablero por ${row.label}`}
                onClick={() => onSelect?.(isSelected ? null : row.key)}
              >
                {content}
              </button>
            ) : (
              <div className="ranked__hit">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
