/**
 * Consultas de los módulos de administración. Cada página verifica el permiso
 * correspondiente (DAL) antes de llamarlas.
 */
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";

// ----------------------------------------------------------------- Usuarios

export const USERS_PAGE_SIZE = 10;

export type UserFilters = {
  q: string;
  roleId: string;
  status: "" | "activos" | "inactivos";
  page: number;
};

/** Normaliza los searchParams de la URL (cualquier valor inesperado se ignora). */
export function parseUserFilters(params: Record<string, string | string[] | undefined>): UserFilters {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const status = first(params.estado);
  const page = Number.parseInt(first(params.pagina), 10);
  return {
    q: first(params.q).trim().slice(0, 100),
    roleId: first(params.rol),
    status: status === "activos" || status === "inactivos" ? status : "",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export async function listUsers(filters: UserFilters) {
  const where: Prisma.UserWhereInput = {
    ...(filters.q && {
      OR: [
        { name: { contains: filters.q, mode: "insensitive" } },
        { email: { contains: filters.q, mode: "insensitive" } },
      ],
    }),
    ...(filters.roleId && { roleId: filters.roleId }),
    ...(filters.status && { active: filters.status === "activos" }),
  };

  const [total, rows] = await db.$transaction([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * USERS_PAGE_SIZE,
      take: USERS_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
        role: { select: { id: true, name: true, isSystem: true } },
      },
    }),
  ]);

  return {
    total,
    pageCount: Math.max(1, Math.ceil(total / USERS_PAGE_SIZE)),
    users: rows.map((user) => ({
      ...user,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    })),
  };
}

export type UserRow = Awaited<ReturnType<typeof listUsers>>["users"][number];

/** Roles para selects y filtros. */
export function listRoleOptions() {
  return db.role.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, isSystem: true } });
}

export type RoleOption = Awaited<ReturnType<typeof listRoleOptions>>[number];

// ----------------------------------------------------------------- Roles

export async function listRoles() {
  const roles = await db.role.findMany({
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      isSystem: true,
      _count: { select: { users: true } },
      permissions: { select: { permissionId: true } },
    },
  });
  return roles.map(({ _count, permissions, ...role }) => ({
    ...role,
    userCount: _count.users,
    permissionIds: permissions.map((item) => item.permissionId),
  }));
}

export type RoleRow = Awaited<ReturnType<typeof listRoles>>[number];

// ----------------------------------------------------------------- Permisos

export async function listPermissions() {
  const permissions = await db.permission.findMany({
    orderBy: [{ module: "asc" }, { key: "asc" }],
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      module: true,
      isSystem: true,
      _count: { select: { roles: true } },
    },
  });
  return permissions.map(({ _count, ...permission }) => ({ ...permission, roleCount: _count.roles }));
}

export type PermissionRow = Awaited<ReturnType<typeof listPermissions>>[number];
