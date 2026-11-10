import "server-only";
import { describeUserAgent } from "@/lib/user-agent";
import { db } from "./db";
import { hashSessionToken, isPersistentSession, readSessionToken } from "./session";

export type ProfilePermission = { key: string; name: string; description: string | null; module: string };

export type ProfileSession = {
  current: boolean;
  persistent: boolean;
  device: string;
  mobile: boolean;
  createdAt: string;
  expiresAt: string;
};

export type Profile = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  role: { name: string; description: string | null; isSystem: boolean };
  /** Permisos efectivos: con el rol de sistema son todos los del catálogo. */
  permissions: ProfilePermission[];
  /** Sesiones vigentes, la actual primero. */
  sessions: ProfileSession[];
};

const permissionSelect = { key: true, name: true, description: true, module: true } as const;
const byModuleThenKey = (a: ProfilePermission, b: ProfilePermission) =>
  a.module.localeCompare(b.module, "es") || a.key.localeCompare(b.key);

/** Perfil del usuario de la sesión. Solo se llama con el id que devuelve `requireUser()`. */
export async function getProfile(userId: string): Promise<Profile> {
  const token = await readSessionToken();
  const currentSessionId = token ? hashSessionToken(token) : null;

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      role: {
        select: {
          name: true,
          description: true,
          isSystem: true,
          permissions: { select: { permission: { select: permissionSelect } } },
        },
      },
      sessions: {
        where: { expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
        select: { id: true, userAgent: true, createdAt: true, expiresAt: true },
      },
    },
  });

  const permissions = user.role.isSystem
    ? await db.permission.findMany({ select: permissionSelect })
    : user.role.permissions.map(({ permission }) => permission);

  const sessions = user.sessions
    .map((session) => {
      const device = describeUserAgent(session.userAgent);
      return {
        current: session.id === currentSessionId,
        persistent: isPersistentSession(session),
        device: device.label,
        mobile: device.mobile,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      };
    })
    .sort((a, b) => Number(b.current) - Number(a.current));

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    active: user.active,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    role: { name: user.role.name, description: user.role.description, isSystem: user.role.isSystem },
    permissions: permissions.sort(byModuleThenKey),
    sessions,
  };
}
