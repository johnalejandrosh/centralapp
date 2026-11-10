/**
 * Constantes compartidas entre el cliente y `proxy.ts`.
 * No importar nada de navegador aquí: este archivo también corre en el servidor.
 */

/** Cookie httpOnly con el token de sesión (su hash se guarda en la tabla `sessions`). */
export const SESSION_COOKIE = "centralapp_session";

/** Rutas públicas de autenticación: un usuario con sesión es enviado al dashboard. */
export const AUTH_ROUTES = ["/login", "/register"] as const;

/** Prefijos que exigen sesión. */
export const PROTECTED_PREFIXES = ["/dashboard"] as const;


export const LOGIN_PATH = "/login";
export const HOME_PATH = "/dashboard";

/** Devuelve un destino interno seguro para `?from=` (evita redirecciones abiertas). */
export function safeRedirectPath(from: string | null | undefined): string {
  if (!from || !from.startsWith("/") || from.startsWith("//")) {
    return HOME_PATH;
  }
  return from;
}
