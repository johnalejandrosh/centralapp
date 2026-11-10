/**
 * Constantes de tema compartidas con el servidor (sin "use client") y script en línea
 * que fija el modo y el tema de color antes del primer pintado (evita destellos).
 */

/** Clave de localStorage con la preferencia de modo (claro / oscuro / sistema). */
export const COLOR_MODE_STORAGE_KEY = "centralapp.color-mode";

/** Clave de localStorage con el tema de color elegido. */
export const APP_THEME_STORAGE_KEY = "centralapp.app-theme";

/** Ids de los temas; deben coincidir con styles/_themes.scss y lib/theme/themes.ts. */
export const APP_THEME_IDS = ["sol", "oceano", "esmeralda", "coral", "lavanda", "grafito"] as const;

export type AppThemeId = (typeof APP_THEME_IDS)[number];

export const DEFAULT_APP_THEME: AppThemeId = "sol";

export function isAppThemeId(value: unknown): value is AppThemeId {
  return typeof value === "string" && (APP_THEME_IDS as readonly string[]).includes(value);
}

/** Debe aplicar las mismas reglas que `applyColorMode` y `applyAppTheme`. */
export const themeInitScript = `(function(){var r=document.documentElement;try{var m=localStorage.getItem("${COLOR_MODE_STORAGE_KEY}");var d=m==="dark"||(m!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);r.setAttribute("data-coreui-theme",d?"dark":"light");var t=localStorage.getItem("${APP_THEME_STORAGE_KEY}");r.setAttribute("data-app-theme",${JSON.stringify(APP_THEME_IDS)}.indexOf(t)>-1?t:"${DEFAULT_APP_THEME}")}catch(e){}})()`;
