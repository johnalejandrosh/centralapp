"use client";

import { useCallback, useSyncExternalStore } from "react";
import { COLOR_MODE_STORAGE_KEY } from "./init-script";

export type ColorMode = "light" | "dark" | "auto";

const CHANGE_EVENT = "centralapp:color-mode";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readStoredMode(): ColorMode {
  try {
    const value = localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "auto";
  } catch {
    return "auto";
  }
}

/** Aplica el tema en `<html data-coreui-theme>` y avisa a quien dependa de los colores (gráficas). */
function applyColorMode(mode: ColorMode) {
  const dark = mode === "dark" || (mode === "auto" && window.matchMedia(DARK_QUERY).matches);
  const root = document.documentElement;
  root.setAttribute("data-coreui-theme", dark ? "dark" : "light");
  root.dispatchEvent(new Event("ColorSchemeChange"));
}

function subscribeMode(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  const onSystemChange = () => {
    applyColorMode(readStoredMode());
    onChange();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === COLOR_MODE_STORAGE_KEY) onSystemChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  media.addEventListener("change", onSystemChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
    media.removeEventListener("change", onSystemChange);
  };
}

/** Preferencia del usuario: claro, oscuro o según el sistema. */
export function useColorMode() {
  const mode = useSyncExternalStore(subscribeMode, readStoredMode, () => "auto" as const);

  const setMode = useCallback((next: ColorMode) => {
    try {
      localStorage.setItem(COLOR_MODE_STORAGE_KEY, next);
    } catch {
      // Sin almacenamiento disponible: el cambio aplica solo a esta visita.
    }
    applyColorMode(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { mode, setMode };
}

function subscribeResolved(onChange: () => void) {
  const root = document.documentElement;
  root.addEventListener("ColorSchemeChange", onChange);
  return () => root.removeEventListener("ColorSchemeChange", onChange);
}

/**
 * Firma del aspecto que se está pintando: modo + tema de color (p. ej. "dark:oceano").
 * Las gráficas la usan como `key` para volver a leer los colores al cambiar cualquiera de los dos.
 */
export function useThemeSignature(): string {
  return useSyncExternalStore(
    subscribeResolved,
    () => {
      const root = document.documentElement;
      return `${root.getAttribute("data-coreui-theme") ?? "light"}:${root.getAttribute("data-app-theme") ?? "sol"}`;
    },
    () => "light:sol",
  );
}
