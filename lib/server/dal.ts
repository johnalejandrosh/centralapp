/**
 * Data Access Layer de autenticación y autorización (patrón recomendado por Next.js).
 * Toda página o Server Action que lea o modifique datos debe pasar por aquí.
 */
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LOGIN_PATH, SESSION_COOKIE } from "@/lib/auth/constants";
import type { PermissionKey } from "@/lib/auth/permissions";
import { db } from "./db";
import { hashSessionToken } from "./session";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  /** Rol de sistema (Administrador): acceso total, sin depender de la lista de permisos. */
  isSuperAdmin: boolean;
  permissions: string[];
};

/** Usuario de la sesión actual o `null`. Memorizado por request con React `cache`. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { id: hashSessionToken(token) },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          active: true,
          role: {
            select: {
              id: true,
              name: true,
              isSystem: true,
              permissions: { select: { permission: { select: { key: true } } } },
            },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date() || !session.user.active) {
    return null;
  }

  const { user } = session;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roleId: user.role.id,
    roleName: user.role.name,
    isSuperAdmin: user.role.isSystem,
    permissions: user.role.permissions.map(({ permission }) => permission.key),
  };
});

export function hasPermission(user: CurrentUser, permission: PermissionKey): boolean {
  return user.isSuperAdmin || user.permissions.includes(permission);
}

/**
 * Para Server Components: devuelve el usuario o redirige.
 * Si hay cookie pero la sesión ya no es válida, pasa por /api/auth/session-expired,
 * que borra la cookie (un Server Component no puede hacerlo) y evita un bucle con proxy.ts.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const hasCookie = (await cookies()).has(SESSION_COOKIE);
    redirect(hasCookie ? "/api/auth/session-expired" : LOGIN_PATH);
  }
  return user;
}

export type AuthorizeResult = { ok: true; user: CurrentUser } | { ok: false; message: string };

/** Para Server Actions: son endpoints públicos, así que cada una verifica sesión y permiso. */
export async function authorize(permission?: PermissionKey): Promise<AuthorizeResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "Tu sesión expiró. Vuelve a iniciar sesión." };
  }
  if (permission && !hasPermission(user, permission)) {
    return { ok: false, message: "No tienes permiso para realizar esta acción." };
  }
  return { ok: true, user };
}
