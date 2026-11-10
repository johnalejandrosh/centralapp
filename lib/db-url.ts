/**
 * Arma la conexión a PostgreSQL a partir de las variables del .env
 * (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SHEMA).
 *
 * Lo usan el CLI de Prisma (prisma.config.ts) y el cliente en tiempo de ejecución
 * (lib/server/db.ts). Sin "server-only" para que también funcione en el CLI y el seed.
 */

type Env = Record<string, string | undefined>;

const REQUIRED = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"] as const;

/** Esquema de PostgreSQL. Acepta DB_SHEMA (nombre usado en el .env) y DB_SCHEMA. */
export function databaseSchema(env: Env = process.env): string {
  return (env.DB_SHEMA ?? env.DB_SCHEMA ?? "public").trim();
}

/**
 * @param withSchema agrega `?schema=` (lo necesita el CLI de Prisma). En tiempo de
 * ejecución el esquema se pasa al adaptador `PrismaPg`, que no lee ese parámetro.
 */
export function databaseUrl(env: Env = process.env, { withSchema = true } = {}): string {
  const missing = REQUIRED.filter((name) => !env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Faltan variables de base de datos en el .env: ${missing.join(", ")}`);
  }

  const value = (name: (typeof REQUIRED)[number]) => env[name]!.trim();
  const user = encodeURIComponent(value("DB_USER"));
  const password = encodeURIComponent(value("DB_PASSWORD"));
  const name = encodeURIComponent(value("DB_NAME"));
  const base = `postgresql://${user}:${password}@${value("DB_HOST")}:${value("DB_PORT")}/${name}`;

  return withSchema ? `${base}?schema=${encodeURIComponent(databaseSchema(env))}` : base;
}
