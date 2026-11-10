"use server";

import { refresh } from "next/cache";
import type { ActionResult } from "@/lib/actions";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorize } from "@/lib/server/dal";
import { db } from "@/lib/server/db";
import { isNotFound, isUniqueViolation } from "@/lib/server/prisma-errors";
import { fieldErrorsOf, roleSchema } from "@/lib/validation/admin";

export type RoleField = "name" | "description" | "permissionIds";

export async function saveRoleAction(_previous: ActionResult<RoleField>, formData: FormData): Promise<ActionResult<RoleField>> {
  const id = String(formData.get("id") ?? "") || null;
  const auth = await authorize(id ? PERMISSIONS.ROLES_UPDATE : PERMISSIONS.ROLES_CREATE);
  if (!auth.ok) return { ok: false, message: auth.message };

  const parsed = roleSchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    permissionIds: formData.getAll("permissionIds").map(String),
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const { name, description } = parsed.data;
  const permissionIds = [...new Set(parsed.data.permissionIds)];

  const existingCount = await db.permission.count({ where: { id: { in: permissionIds } } });
  if (existingCount !== permissionIds.length) {
    return { ok: false, message: "Algunos permisos ya no existen. Recarga la página e inténtalo de nuevo." };
  }

  try {
    if (id) {
      const role = await db.role.findUnique({ where: { id }, select: { name: true, isSystem: true } });
      if (!role) return { ok: false, message: "El rol ya no existe." };

      if (role.isSystem) {
        // El rol de sistema conserva su nombre y su acceso total; solo cambia la descripción.
        if (name !== role.name) return { ok: false, fieldErrors: { name: "El nombre del rol de sistema no se puede cambiar." } };
        await db.role.update({ where: { id }, data: { description } });
      } else {
        await db.role.update({
          where: { id },
          data: {
            name,
            description,
            permissions: { deleteMany: {}, create: permissionIds.map((permissionId) => ({ permissionId })) },
          },
        });
      }
      refresh();
      return { ok: true, message: `Se actualizó el rol ${name}.` };
    }

    await db.role.create({
      data: { name, description, permissions: { create: permissionIds.map((permissionId) => ({ permissionId })) } },
    });
    refresh();
    return { ok: true, message: `Se creó el rol ${name}.` };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, fieldErrors: { name: "Ya existe un rol con este nombre." } };
    if (isNotFound(error)) return { ok: false, message: "El rol ya no existe." };
    throw error;
  }
}

export async function deleteRoleAction(id: string): Promise<ActionResult> {
  const auth = await authorize(PERMISSIONS.ROLES_DELETE);
  if (!auth.ok) return { ok: false, message: auth.message };

  const role = await db.role.findUnique({ where: { id }, select: { name: true, isSystem: true, _count: { select: { users: true } } } });
  if (!role) return { ok: false, message: "El rol ya no existe." };
  if (role.isSystem) return { ok: false, message: "El rol de sistema no se puede eliminar." };
  if (role._count.users > 0) {
    const users = role._count.users === 1 ? "1 usuario asignado" : `${role._count.users} usuarios asignados`;
    return { ok: false, message: `El rol ${role.name} tiene ${users}. Reasígnalos antes de eliminarlo.` };
  }

  await db.role.delete({ where: { id } });
  refresh();
  return { ok: true, message: `Se eliminó el rol ${role.name}.` };
}
