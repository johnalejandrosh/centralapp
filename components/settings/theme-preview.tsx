import type { CSSProperties } from "react";
import type { AppTheme } from "@/lib/theme/themes";

/** Miniatura del panel dibujada con los colores de un tema (no con los del tema activo). */
export function ThemePreview({ theme }: { theme: AppTheme }) {
  const { swatches } = theme;
  const style = {
    "--tp-primary": swatches.primary,
    "--tp-on-primary": swatches.onPrimary,
    "--tp-canvas": swatches.canvas,
    "--tp-sidebar": swatches.sidebar,
    "--tp-sidebar-fg": swatches.sidebarFg,
    "--tp-sidebar-primary": swatches.sidebarPrimary,
    "--tp-sidebar-on-primary": swatches.sidebarOnPrimary,
    "--tp-c1": swatches.charts[0],
    "--tp-c2": swatches.charts[1],
    "--tp-c3": swatches.charts[2],
    "--tp-c4": swatches.charts[3],
  } as CSSProperties;

  return (
    <div className="theme-preview" style={style} aria-hidden="true">
      <div className="theme-preview__sidebar">
        <span className="theme-preview__logo" />
        <span className="theme-preview__nav theme-preview__nav--active" />
        <span className="theme-preview__nav" />
        <span className="theme-preview__nav" />
        <span className="theme-preview__nav" />
      </div>
      <div className="theme-preview__main">
        <div className="theme-preview__topbar">
          <span className="theme-preview__search" />
          <span className="theme-preview__button">Aa</span>
        </div>
        <div className="theme-preview__kpis">
          <span style={{ background: "var(--tp-c1)" }} />
          <span style={{ background: "var(--tp-c2)" }} />
          <span style={{ background: "var(--tp-c3)" }} />
        </div>
        <div className="theme-preview__chart">
          {[42, 58, 50, 72, 64, 88].map((height, index) => (
            <span key={index} style={{ height: `${height}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
