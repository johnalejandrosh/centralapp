import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { databaseSchema, databaseUrl } from "@/lib/db-url";

function createClient() {
  // El adaptador de `pg` no lee `?schema=` de la URL: el esquema se le pasa como opción.
  const adapter = new PrismaPg(
    { connectionString: databaseUrl(process.env, { withSchema: false }) },
    { schema: databaseSchema() },
  );
  return new PrismaClient({ adapter });
}

// En desarrollo, el recargado en caliente reevalúa módulos: se reutiliza un único cliente.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
