import "server-only";
import { Prisma } from "@/generated/prisma/client";

/** Violación de índice único (P2002), p. ej. correo o nombre de rol repetido. */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/** El registro ya no existe (P2025): otra persona lo eliminó mientras tanto. */
export function isNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

/** Restricción de clave foránea (P2003), p. ej. eliminar un rol con usuarios. */
export function isForeignKeyViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";
}
