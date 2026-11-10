"use server";

import { refresh } from "next/cache";
import type { ActionResult } from "@/lib/actions";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorize } from "@/lib/server/dal";
import { db } from "@/lib/server/db";
import { hashPassword } from "@/lib/server/password";
import { isNotFound, isUniqueViolation } from "@/lib/server/prisma-errors";
import { deleteUserSessions } from "@/lib/server/session";
import { fieldErrorsOf, userSchema } from "@/lib/validation/admin";

export type UserField = "name" | "email" | "roleId" | "password" | "active";

/** ¿Queda otro administrador activo además de `excludeId`? (evita dejar la plataforma sin administración). */
async function hasAnotherActiveAdmin(excludeId: string) {
  const count = await db.user.count({ where: { id: { not: excludeId }, active: true, role: { isSystem: true } } });
  return count > 0;
}

const LAST_ADMIN_MESSAGE = "Debe quedar al menos un administrador activo.";

export async function saveUserAction(_previous: ActionResult<UserField>, formData: FormData): Promise<ActionResult<UserField>> {
  const id = String(formData.get("id") ?? "") || null;
  const auth = await authorize(id ? PERMISSIONS.USERS_UPDATE : PERMISSIONS.USERS_CREATE);
  if (!auth.ok) return { ok: false, message: auth.message };

  const parsed = userSchema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    roleId: formData.get("roleId") ?? "",
    active: formData.get("active") === "on",
    password: formData.get("password") ?? "",
  });
  // Al crear, la contraseña es obligatoria: se informa junto con los demás errores.
  const missingPassword = !id && !formData.get("password") ? { password: "Define una contraseña inicial." } : {};
  if (!parsed.success) return { ok: false, fieldErrors: { ...fieldErrorsOf(parsed.error), ...missingPassword } };
  if ("password" in missingPassword) return { ok: false, fieldErrors: missingPassword };

  const data = parsed.data;

  const role = await db.role.findUnique({ where: { id: data.roleId }, select: { isSystem: true } });
  if (!role) return { ok: false, fieldErrors: { roleId: "El rol elegido ya no existe." } };

  try {
    if (id) {
      const current = await db.user.findUnique({
        where: { id },
        select: { active: true, roleId: true, role: { select: { isSystem: true } } },
      });
      if (!current) return { ok: false, message: "El usuario ya no existe." };

      if (id === auth.user.id) {
        if (!data.active) return { ok: false, fieldErrors: { active: "No puedes desactivar tu propia cuenta." } };
        if (data.roleId !== current.roleId) return { ok: false, fieldErrors: { roleId: "No puedes cambiar tu propio rol." } };
      }

      const losesAdmin = current.role.isSystem && current.active && (!role.isSystem || !data.active);
      if (losesAdmin && !(await hasAnotherActiveAdmin(id))) return { ok: false, message: LAST_ADMIN_MESSAGE };

      await db.user.update({
        where: { id },
        data: {
          name: data.name,
          email: data.email,
          roleId: data.roleId,
          active: data.active,
          ...(data.password && { passwordHash: await hashPassword(data.password) }),
        },
      });
      // Desactivar o cambiar la contraseña cierra sus otras sesiones.
      if (!data.active || data.password) await deleteUserSessions(id);

      refresh();
      return { ok: true, message: `Se actualizó a ${data.name}.` };
    }

    await db.user.create({
      data: {
        name: data.name,
        email: data.email,
        roleId: data.roleId,
        active: data.active,
        passwordHash: await hashPassword(data.password),
      },
    });
    refresh();
    return { ok: true, message: `Se creó la cuenta de ${data.name}.` };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, fieldErrors: { email: "Ya existe un usuario con este correo." } };
    if (isNotFound(error)) return { ok: false, message: "El usuario ya no existe." };
    throw error;
  }
}

export async function toggleUserActiveAction(id: string): Promise<ActionResult> {
  const auth = await authorize(PERMISSIONS.USERS_UPDATE);
  if (!auth.ok) return { ok: false, message: auth.message };
  if (id === auth.user.id) return { ok: false, message: "No puedes desactivar tu propia cuenta." };

  const user = await db.user.findUnique({ where: { id }, select: { name: true, active: true, role: { select: { isSystem: true } } } });
  if (!user) return { ok: false, message: "El usuario ya no existe." };
  if (user.active && user.role.isSystem && !(await hasAnotherActiveAdmin(id))) return { ok: false, message: LAST_ADMIN_MESSAGE };

  await db.user.update({ where: { id }, data: { active: !user.active } });
  if (user.active) await deleteUserSessions(id);

  refresh();
  return { ok: true, message: user.active ? `Se desactivó a ${user.name}.` : `Se activó a ${user.name}.` };
}

export async function deleteUserAction(id: string): Promise<ActionResult> {
  const auth = await authorize(PERMISSIONS.USERS_DELETE);
  if (!auth.ok) return { ok: false, message: auth.message };
  if (id === auth.user.id) return { ok: false, message: "No puedes eliminar tu propia cuenta." };

  const user = await db.user.findUnique({ where: { id }, select: { name: true, active: true, role: { select: { isSystem: true } } } });
  if (!user) return { ok: false, message: "El usuario ya no existe." };
  if (user.active && user.role.isSystem && !(await hasAnotherActiveAdmin(id))) return { ok: false, message: LAST_ADMIN_MESSAGE };

  // Sus sesiones se eliminan en cascada.
  await db.user.delete({ where: { id } });
  refresh();
  return { ok: true, message: `Se eliminó a ${user.name}.` };
}
