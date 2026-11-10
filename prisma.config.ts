import "dotenv/config";
import { defineConfig } from "prisma/config";
import { databaseUrl } from "./lib/db-url";

// Prisma 7 no carga el .env por sí solo: lo hace `dotenv/config`.
// La URL se arma desde DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD y DB_SHEMA.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl(),
  },
});
