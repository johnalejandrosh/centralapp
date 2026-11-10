"use client";

import { createContext, use, useMemo, type ReactNode } from "react";
import type { PermissionKey } from "@/lib/auth/permissions";

/** Datos de la sesión que el servidor comparte con el cliente (sin nada sensible). */
export type ClientUser = {
  id: string;
  name: string;
  email: string;
  roleName: string;
  isSuperAdmin: boolean;
  permissions: string[];
};

type SessionContextValue = {
  user: ClientUser;
  /** Solo para mostrar u ocultar UI: el servidor vuelve a verificar en cada acción. */
  can: (permission: PermissionKey) => boolean;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ user, children }: { user: ClientUser; children: ReactNode }) {
  const value = useMemo<SessionContextValue>(
    () => ({ user, can: (permission) => user.isSuperAdmin || user.permissions.includes(permission) }),
    [user],
  );
  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionContextValue {
  const session = use(SessionContext);
  if (!session) {
    throw new Error("useSession debe usarse dentro de <SessionProvider>.");
  }
  return session;
}
