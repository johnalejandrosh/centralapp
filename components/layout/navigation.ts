import { cilChartPie, cilLockLocked, cilPuzzle, cilSettings, cilSpeedometer } from "@coreui/icons";
import { PERMISSIONS, type PermissionKey } from "@/lib/auth/permissions";

type Badge = { text: string; color: string };

export type NavLinkEntry = {
  kind: "link";
  label: string;
  href: string;
  /** Opcional en los ítems de un submenú (se muestra una viñeta). */
  icon?: string[];
  badge?: Badge;
  /** Para secciones aún no implementadas. */
  disabled?: boolean;
  /** Si se indica, el ítem solo se muestra a quien tenga este permiso. */
  permission?: PermissionKey;
};

export type NavEntry =
  | { kind: "title"; label: string }
  | NavLinkEntry
  | {
      kind: "group";
      label: string;
      icon: string[];
      items: NavLinkEntry[];
    };

const soon: Badge = { text: "Pronto", color: "secondary" };

export const navigation: NavEntry[] = [
  { kind: "title", label: "General" },
  { kind: "link", label: "Resumen", href: "/dashboard", icon: cilSpeedometer },
  {
    kind: "group",
    label: "Tableros",
    icon: cilChartPie,
    items: [
      { kind: "link", label: "Tablero 1", href: "/dashboard/tableros/tablero-1", permission: PERMISSIONS.TABLERO1_VIEW },
      { kind: "link", label: "Tablero 2", href: "/dashboard/tableros/tablero-2", permission: PERMISSIONS.TABLERO2_VIEW },
    ],
  },
  { kind: "title", label: "Administración" },
  {
    kind: "group",
    label: "Usuarios y acceso",
    icon: cilLockLocked,
    items: [
      { kind: "link", label: "Usuarios", href: "/dashboard/usuarios", permission: PERMISSIONS.USERS_READ },
      { kind: "link", label: "Roles", href: "/dashboard/roles", permission: PERMISSIONS.ROLES_READ },
      { kind: "link", label: "Permisos", href: "/dashboard/permisos", permission: PERMISSIONS.PERMISSIONS_READ },
    ],
  },
  {
    kind: "group",
    label: "Integraciones",
    icon: cilPuzzle,
    items: [
      { kind: "link", label: "Conexiones", href: "/dashboard/integraciones", permission: PERMISSIONS.INTEGRATIONS_READ },
      { kind: "link", label: "Pancake POS", href: "/dashboard/integraciones/pancake", permission: PERMISSIONS.INTEGRATIONS_READ },
      { kind: "link", label: "Shopify", href: "/dashboard/integraciones/shopify", permission: PERMISSIONS.INTEGRATIONS_READ },
    ],
  },
  {
    kind: "group",
    label: "Configuración",
    icon: cilSettings,
    items: [
      { kind: "link", label: "Temas", href: "/dashboard/configuracion/temas" },
      { kind: "link", label: "Perfil", href: "/dashboard/configuracion/perfil" },
      { kind: "link", label: "Notificaciones", href: "/dashboard/configuracion/notificaciones", badge: soon, disabled: true },
    ],
  },
];
