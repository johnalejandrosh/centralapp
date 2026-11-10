import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { db } from "./db";

/** Duración con "Recordarme" (cookie persistente) y sin él (cookie de sesión del navegador). */
const PERSISTENT_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const BROWSER_SESSION_MS = 12 * 60 * 60 * 1000;

/** ¿Se inició con "Recordarme"? Se deduce de su duración (30 días frente a 12 h). */
export const isPersistentSession = ({ createdAt, expiresAt }: { createdAt: Date; expiresAt: Date }) =>
  expiresAt.getTime() - createdAt.getTime() > BROWSER_SESSION_MS * 2;

/** En la base solo se guarda el hash del token: una filtración de la tabla no permite suplantar sesiones. */
export const hashSessionToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string, { persistent }: { persistent: boolean }) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + (persistent ? PERSISTENT_SESSION_MS : BROWSER_SESSION_MS));
  const requestHeaders = await headers();

  await db.session.create({
    data: {
      id: hashSessionToken(token),
      userId,
      expiresAt,
      userAgent: requestHeaders.get("user-agent")?.slice(0, 255) ?? null,
    },
  });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: requestHeaders.get("x-forwarded-proto") === "https",
    // Sin "Recordarme" no se fija `expires`: el navegador la borra al cerrarse.
    ...(persistent ? { expires: expiresAt } : {}),
  });
}

export async function readSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** Cierra la sesión actual: la borra de la base y elimina la cookie. */
export async function deleteCurrentSession() {
  const token = await readSessionToken();
  if (token) {
    await db.session.deleteMany({ where: { id: hashSessionToken(token) } });
  }
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * Cierra las sesiones de un usuario (al desactivarlo o cambiar su contraseña).
 * Si es el propio usuario, conserva la sesión desde la que hizo el cambio.
 */
export async function deleteUserSessions(userId: string) {
  const token = await readSessionToken();
  await db.session.deleteMany({
    where: { userId, ...(token && { id: { not: hashSessionToken(token) } }) },
  });
}
