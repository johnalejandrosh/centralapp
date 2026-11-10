type LogoProps = {
  /** Tamaño del isotipo en px. */
  size?: number;
  /** Muestra el nombre junto al isotipo. */
  withWordmark?: boolean;
  /** Clases extra para el nombre (p. ej. helpers del sidebar contraído). */
  wordmarkClassName?: string;
  /** Variante para el panel de marca (sobre el degradado del tema). */
  inverted?: boolean;
};

/**
 * Isotipo de CentralApp: un núcleo con un arco que lo rodea.
 * Toma sus colores del tema activo (--app-logo-*); en SVG van como `style`
 * porque los atributos de presentación no aceptan var().
 */
export function Logo({ size = 32, withWordmark = true, wordmarkClassName = "", inverted = false }: LogoProps) {
  return (
    <>
      <svg className="brand-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <defs>
          <linearGradient id="ca-logo-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: "var(--app-logo-from)" }} />
            <stop offset="1" style={{ stopColor: "var(--app-logo-to)" }} />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" style={{ fill: inverted ? "var(--app-logo-inverted-bg)" : "url(#ca-logo-gradient)" }} />
        <path
          d="M22.4 10.6a8 8 0 1 0 0 10.8"
          fill="none"
          strokeWidth="2.6"
          strokeLinecap="round"
          style={{ stroke: inverted ? "var(--app-logo-inverted-stroke)" : "var(--app-logo-stroke)" }}
        />
        <circle cx="16" cy="16" r="3" style={{ fill: inverted ? "var(--app-accent)" : "var(--app-logo-dot)" }} />
      </svg>
      {withWordmark && (
        <span className={`brand-wordmark ${wordmarkClassName}`}>
          Central<span style={inverted ? { color: "var(--app-aside-wordmark)" } : undefined}>App</span>
        </span>
      )}
    </>
  );
}
