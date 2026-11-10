import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ROUTES, HOME_PATH, LOGIN_PATH, PROTECTED_PREFIXES, SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Chequeo optimista de sesión: solo mira si existe la cookie, no la valida.
 * Cuando haya backend, la verificación real debe hacerse en la API / capa de datos.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const isAuthRoute = (AUTH_ROUTES as readonly string[]).includes(pathname);

  if (isProtected && !hasSession) {
    const loginUrl = new URL(LOGIN_PATH, request.nextUrl);
    loginUrl.searchParams.set("from", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL(HOME_PATH, request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
