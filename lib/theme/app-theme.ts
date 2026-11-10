"use client";

import { useCallback, useSyncExternalStore } from "react";
import { APP_THEME_STORAGE_KEY, DEFAULT_APP_THEME, isAppThemeId, type AppThemeId } from "./init-script";

const CHANGE_EVENT = "centralapp:app-theme";

function readStoredTheme(): AppThemeId {
  try {
    const value = localStorage.getItem(APP_THEME_STORAGE_KEY);
    return isAppThemeId(value) ? value : DEFAULT_APP_THEME;
  } catch {
    return DEFAULT_APP_THEME;
  }
}

/** Aplica el tema en `<html data-app-theme>` y avisa a quien dependa de los colores (gráficas). */
function applyAppTheme(theme: AppThemeId) {
  const root = document.documentElement;
  root.setAttribute("data-app-theme", theme);
  root.dispatchEvent(new Event("ColorSchemeChange"));
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === APP_THEME_STORAGE_KEY) {
      applyAppTheme(readStoredTheme());
      onChange();
    }
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Tema de color elegido por el usuario (se guarda en este navegador). */
export function useAppTheme() {
  const theme = useSyncExternalStore(subscribe, readStoredTheme, () => DEFAULT_APP_THEME);

  const setTheme = useCallback((next: AppThemeId) => {
    try {
      localStorage.setItem(APP_THEME_STORAGE_KEY, next);
    } catch {
      // Sin almacenamiento disponible: el cambio aplica solo a esta visita.
    }
    applyAppTheme(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { theme, setTheme };
}
