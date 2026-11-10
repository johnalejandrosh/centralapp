/**
 * Datos iniciales: permisos del sistema, roles base y un administrador.
 * Es idempotente: se puede ejecutar varias veces sin duplicar ni pisar cambios hechos
 * desde la aplicación (los roles existentes no se modifican).
 *
 *   npx prisma db seed
 *
 * Variables opcionales: SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { ADMIN_ROLE_NAME, SEED_ROLES, SYSTEM_PERMISSIONS } from "../lib/auth/permissions";
import { databaseSchema, databaseUrl } from "../lib/db-url";
import { hashPassword } from "../lib/server/password";

const adapter = new PrismaPg({ connectionString: databaseUrl(process.env, { withSchema: false }) }, { schema: databaseSchema() });
const db = new PrismaClient({ adapter });

async function main() {
  for (const permission of SYSTEM_PERMISSIONS) {
    await db.permission.upsert({
      where: { key: permission.key },
      update: { isSystem: true },
      create: { ...permission, isSystem: true },
    });
  }
  console.log(`✔ ${SYSTEM_PERMISSIONS.length} permisos del sistema`);

  for (const role of SEED_ROLES) {
    const existing = await db.role.findUnique({ where: { name: role.name } });
    if (existing) {
      console.log(`• Rol "${role.name}" ya existe, sin cambios`);
      continue;
    }
    await db.role.create({
      data: {
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        permissions: { create: role.permissions.map((key) => ({ permission: { connect: { key } } })) },
      },
    });
    console.log(`✔ Rol "${role.name}" creado`);
  }

  const email = (process.env.SEED_ADMIN_EMAIL ?? "demo@centralapp.com").trim().toLowerCase();
  const existingAdmin = await db.user.findUnique({ where: { email } });
  if (existingAdmin) {
    console.log(`• Usuario ${email} ya existe, sin cambios`);
  } else {
    const adminRole = await db.role.findUniqueOrThrow({ where: { name: ADMIN_ROLE_NAME } });
    await db.user.create({
      data: {
        name: "Usuario Demo",
        email,
        passwordHash: await hashPassword(process.env.SEED_ADMIN_PASSWORD ?? "demo1234"),
        roleId: adminRole.id,
      },
    });
    console.log(`✔ Administrador ${email} creado`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
