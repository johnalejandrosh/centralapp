import { NextResponse, type NextRequest } from "next/server";
import { HOME_PATH, LOGIN_PATH, SESSION_COOKIE } from "@/lib/auth/constants";
import { getCurrentUser } from "@/lib/server/dal";
import { db } from "@/lib/server/db";
import { hashSessionToken } from "@/lib/server/session";

/**
 * Destino de `requireUser()` cuando la cookie existe pero la sesión ya no es válida
 * (expiró, se cerró desde otro lado o el usuario fue desactivado).
 * Solo borra sesiones inválidas: con una sesión válida devuelve al panel.
 */
export async function GET(request: NextRequest) {
  if (await getCurrentUser()) {
    return NextResponse.redirect(new URL(HOME_PATH, request.url));
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { id: hashSessionToken(token) } });
  }

  const response = NextResponse.redirect(new URL(`${LOGIN_PATH}?sesion=expirada`, request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
