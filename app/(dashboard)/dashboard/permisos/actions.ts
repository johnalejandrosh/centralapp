"use server";

import { refresh } from "next/cache";
import type { ActionResult } from "@/lib/actions";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorize } from "@/lib/server/dal";
import { db } from "@/lib/server/db";
import { isNotFound, isUniqueViolation } from "@/lib/server/prisma-errors";
import { fieldErrorsOf, permissionSchema } from "@/lib/validation/admin";

export type PermissionField = "key" | "name" | "module" | "description";

export async function savePermissionAction(
  _previous: ActionResult<PermissionField>,
  formData: FormData,
): Promise<ActionResult<PermissionField>> {
  const id = String(formData.get("id") ?? "") || null;
  const auth = await authorize(id ? PERMISSIONS.PERMISSIONS_UPDATE : PERMISSIONS.PERMISSIONS_CREATE);
  if (!auth.ok) return { ok: false, message: auth.message };

  const parsed = permissionSchema.safeParse({
    key: formData.get("key") ?? "",
    name: formData.get("name") ?? "",
    module: formData.get("module") ?? "",
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  const data = parsed.data;

  try {
    if (id) {
      const current = await db.permission.findUnique({ where: { id }, select: { key: true, module: true, isSystem: true } });
      if (!current) return { ok: false, message: "El permiso ya no existe." };
      // La aplicación consulta los permisos de sistema por su clave: no puede cambiar.
      if (current.isSystem && data.key !== current.key) {
        return { ok: false, fieldErrors: { key: "La clave de un permiso de sistema no se puede cambiar." } };
      }
      await db.permission.update({ where: { id }, data });
      refresh();
      return { ok: true, message: `Se actualizó el permiso ${data.name}.` };
    }

    await db.permission.create({ data });
    refresh();
    return { ok: true, message: `Se creó el permiso ${data.name}.` };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, fieldErrors: { key: "Ya existe un permiso con esta clave." } };
    if (isNotFound(error)) return { ok: false, message: "El permiso ya no existe." };
    throw error;
  }
}

export async function deletePermissionAction(id: string): Promise<ActionResult> {
  const auth = await authorize(PERMISSIONS.PERMISSIONS_DELETE);
  if (!auth.ok) return { ok: false, message: auth.message };

  const permission = await db.permission.findUnique({ where: { id }, select: { name: true, isSystem: true } });
  if (!permission) return { ok: false, message: "El permiso ya no existe." };
  if (permission.isSystem) return { ok: false, message: "Los permisos de sistema no se pueden eliminar." };

  // Las asignaciones a roles se eliminan en cascada.
  await db.permission.delete({ where: { id } });
  refresh();
  return { ok: true, message: `Se eliminó el permiso ${permission.name}.` };
}
