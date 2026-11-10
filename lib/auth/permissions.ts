/**
 * Catálogo de permisos que usa la aplicación. Compartido entre cliente, servidor y seed.
 * Estos permisos se crean como "de sistema" (no se pueden eliminar ni cambiar su clave);
 * desde la UI se pueden crear permisos adicionales para módulos futuros.
 */

export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",
  USERS_READ: "users.read",
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",
  USERS_DELETE: "users.delete",
  ROLES_READ: "roles.read",
  ROLES_CREATE: "roles.create",
  ROLES_UPDATE: "roles.update",
  ROLES_DELETE: "roles.delete",
  PERMISSIONS_READ: "permissions.read",
  PERMISSIONS_CREATE: "permissions.create",
  PERMISSIONS_UPDATE: "permissions.update",
  PERMISSIONS_DELETE: "permissions.delete",
  INTEGRATIONS_READ: "integrations.read",
  INTEGRATIONS_CREATE: "integrations.create",
  INTEGRATIONS_UPDATE: "integrations.update",
  INTEGRATIONS_DELETE: "integrations.delete",
  INTEGRATIONS_SYNC: "integrations.sync",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const SYSTEM_PERMISSIONS: { key: PermissionKey; name: string; module: string; description: string }[] = [
  { key: "dashboard.view", name: "Ver resumen", module: "Resumen", description: "Acceso al panel de resumen." },
  { key: "users.read", name: "Ver usuarios", module: "Usuarios", description: "Consultar la lista de usuarios." },
  { key: "users.create", name: "Crear usuarios", module: "Usuarios", description: "Dar de alta nuevos usuarios." },
  { key: "users.update", name: "Editar usuarios", module: "Usuarios", description: "Modificar datos, rol y estado de usuarios." },
  { key: "users.delete", name: "Eliminar usuarios", module: "Usuarios", description: "Eliminar usuarios de forma permanente." },
  { key: "roles.read", name: "Ver roles", module: "Roles", description: "Consultar roles y sus permisos." },
  { key: "roles.create", name: "Crear roles", module: "Roles", description: "Crear roles nuevos." },
  { key: "roles.update", name: "Editar roles", module: "Roles", description: "Cambiar nombre, descripción y permisos de un rol." },
  { key: "roles.delete", name: "Eliminar roles", module: "Roles", description: "Eliminar roles sin usuarios asignados." },
  { key: "permissions.read", name: "Ver permisos", module: "Permisos", description: "Consultar el catálogo de permisos." },
  { key: "permissions.create", name: "Crear permisos", module: "Permisos", description: "Agregar permisos al catálogo." },
  { key: "permissions.update", name: "Editar permisos", module: "Permisos", description: "Modificar nombre, módulo y descripción de permisos." },
  { key: "permissions.delete", name: "Eliminar permisos", module: "Permisos", description: "Eliminar permisos que no son del sistema." },
  { key: "integrations.read", name: "Ver integraciones", module: "Integraciones", description: "Consultar las conexiones con servicios externos y su guía." },
  { key: "integrations.create", name: "Conectar integraciones", module: "Integraciones", description: "Agregar conexiones nuevas (p. ej. una tienda de Pancake POS)." },
  { key: "integrations.update", name: "Editar integraciones", module: "Integraciones", description: "Cambiar credenciales, nombre o estado de una conexión." },
  { key: "integrations.delete", name: "Eliminar integraciones", module: "Integraciones", description: "Quitar conexiones y sus credenciales." },
  { key: "integrations.sync", name: "Sincronizar integraciones", module: "Integraciones", description: "Probar conexiones y consultar datos del proveedor (órdenes, CPA)." },
];

/** Roles que crea el seed. El Administrador es de sistema y tiene acceso total. */
export const ADMIN_ROLE_NAME = "Administrador";
export const DEFAULT_ROLE_NAME = "Usuario";

export const SEED_ROLES: { name: string; description: string; isSystem: boolean; permissions: PermissionKey[] }[] = [
  {
    name: ADMIN_ROLE_NAME,
    description: "Acceso total a la plataforma.",
    isSystem: true,
    permissions: [],
  },
  {
    name: "Gestor",
    description: "Administra usuarios y consulta roles y permisos.",
    isSystem: false,
    permissions: ["dashboard.view", "users.read", "users.create", "users.update", "roles.read", "permissions.read"],
  },
  {
    name: DEFAULT_ROLE_NAME,
    description: "Rol por defecto de las cuentas nuevas.",
    isSystem: false,
    permissions: ["dashboard.view"],
  },
];
