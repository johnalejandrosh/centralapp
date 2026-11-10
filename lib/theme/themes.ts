import type { AppThemeId } from "./init-script";

export type AppTheme = {
  id: AppThemeId;
  name: string;
  description: string;
  sidebar: "light" | "dark";
  /** Colores para la miniatura de la galería (deben coincidir con styles/_themes.scss). */
  swatches: {
    primary: string;
    onPrimary: string;
    canvas: string;
    sidebar: string;
    sidebarFg: string;
    sidebarPrimary: string;
    sidebarOnPrimary: string;
    charts: [string, string, string, string];
  };
};

export const APP_THEMES: AppTheme[] = [
  {
    id: "sol",
    name: "Sol",
    description: "Amarillo vivo y tinta. Enérgico, claro y directo.",
    sidebar: "light",
    swatches: {
      primary: "#facc15",
      onPrimary: "#1c1917",
      canvas: "#f6f3ea",
      sidebar: "#ffffff",
      sidebarFg: "#1c1917",
      sidebarPrimary: "#facc15",
      sidebarOnPrimary: "#1c1917",
      charts: ["#eab308", "#f97316", "#0ea5e9", "#ec4899"],
    },
  },
  {
    id: "oceano",
    name: "Océano",
    description: "Azul profundo con destellos cian. Sobrio y confiable.",
    sidebar: "light",
    swatches: {
      primary: "#0369a1",
      onPrimary: "#ffffff",
      canvas: "#eef3f8",
      sidebar: "#ffffff",
      sidebarFg: "#0f172a",
      sidebarPrimary: "#0369a1",
      sidebarOnPrimary: "#ffffff",
      charts: ["#0369a1", "#06b6d4", "#f59e0b", "#8b5cf6"],
    },
  },
  {
    id: "esmeralda",
    name: "Esmeralda",
    description: "Verde bosque, lima y menú oscuro. Natural y elegante.",
    sidebar: "dark",
    swatches: {
      primary: "#047857",
      onPrimary: "#ffffff",
      canvas: "#eff5f1",
      sidebar: "#052e22",
      sidebarFg: "#ffffff",
      sidebarPrimary: "#34d399",
      sidebarOnPrimary: "#0c0a09",
      charts: ["#047857", "#84cc16", "#0ea5e9", "#f59e0b"],
    },
  },
  {
    id: "coral",
    name: "Coral",
    description: "Rosa intenso y durazno. Cálido y moderno.",
    sidebar: "light",
    swatches: {
      primary: "#e11d48",
      onPrimary: "#ffffff",
      canvas: "#fbf3f2",
      sidebar: "#ffffff",
      sidebarFg: "#1c1917",
      sidebarPrimary: "#e11d48",
      sidebarOnPrimary: "#ffffff",
      charts: ["#e11d48", "#fb923c", "#8b5cf6", "#0ea5e9"],
    },
  },
  {
    id: "lavanda",
    name: "Lavanda",
    description: "Violeta y rosa. Creativo, suave y actual.",
    sidebar: "light",
    swatches: {
      primary: "#7c3aed",
      onPrimary: "#ffffff",
      canvas: "#f4f2fa",
      sidebar: "#ffffff",
      sidebarFg: "#1e1b4b",
      sidebarPrimary: "#7c3aed",
      sidebarOnPrimary: "#ffffff",
      charts: ["#7c3aed", "#ec4899", "#14b8a6", "#f59e0b"],
    },
  },
  {
    id: "grafito",
    name: "Grafito",
    description: "Monocromo con acento ámbar y menú oscuro. Minimalista.",
    sidebar: "dark",
    swatches: {
      primary: "#18181b",
      onPrimary: "#ffffff",
      canvas: "#f4f4f5",
      sidebar: "#09090b",
      sidebarFg: "#ffffff",
      sidebarPrimary: "#fafafa",
      sidebarOnPrimary: "#0c0a09",
      charts: ["#18181b", "#f59e0b", "#71717a", "#a1a1aa"],
    },
  },
];
