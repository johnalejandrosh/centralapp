/** Lee una variable CSS de CoreUI (p. ej. `--cui-primary`). En el servidor devuelve el respaldo. */
export function cssVar(name: string, fallback = ""): string {
  if (typeof window === "undefined") {
    return fallback;
  }
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

let context: CanvasRenderingContext2D | null | undefined;

/**
 * Devuelve el color con opacidad `alpha`, para rellenos semitransparentes.
 * CoreUI define sus colores en varios formatos (`#39f`, `#1b9e3e`, `rgb(24%, 60%, 96%)`),
 * así que el navegador lo normaliza a través de un canvas antes de aplicar el alfa.
 */
export function withAlpha(color: string, alpha: number): string {
  if (typeof document === "undefined") {
    return color;
  }
  context ??= document.createElement("canvas").getContext("2d");
  if (!context) {
    return color;
  }
  context.fillStyle = "#000";
  context.fillStyle = color;
  const normalized = String(context.fillStyle);

  const hex = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(normalized);
  if (hex) {
    const [r, g, b] = hex.slice(1).map((part) => parseInt(part, 16));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const rgb = /^rgba?\(([^,]+),([^,]+),([^,)]+)/.exec(normalized);
  if (rgb) {
    return `rgba(${rgb[1].trim()}, ${rgb[2].trim()}, ${rgb[3].trim()}, ${alpha})`;
  }

  return color;
}
