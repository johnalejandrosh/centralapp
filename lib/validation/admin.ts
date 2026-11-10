/** Esquemas de validación (Zod) de los módulos de administración. Se usan en el servidor. */
import { z } from "zod";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/validation";
import { isProviderId } from "@/lib/integrations/catalog";

const name = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(2, { error: `${label} debe tener al menos 2 caracteres.` })
    .max(max, { error: `${label} admite hasta ${max} caracteres.` });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Admite hasta ${max} caracteres.` })
    .transform((value) => value || null);

export const userSchema = z.object({
  name: name("El nombre", 120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Ingresa un correo válido." }).max(254, { error: "Correo demasiado largo." })),
  roleId: z.string().min(1, { error: "Elige un rol." }),
  active: z.boolean(),
  // Vacío al editar = conservar la contraseña actual.
  password: z.union([
    z.literal(""),
    z.string().min(MIN_PASSWORD_LENGTH, { error: `Mínimo ${MIN_PASSWORD_LENGTH} caracteres.` }).max(128),
  ]),
});

export const roleSchema = z.object({
  name: name("El nombre", 60),
  description: optionalText(255),
  permissionIds: z.array(z.string().min(1)),
});

/** Claves tipo "modulo.accion" en minúsculas, p. ej. "reports.export". */
export const PERMISSION_KEY_PATTERN = /^[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)+$/;

export const permissionSchema = z.object({
  key: z
    .string()
    .trim()
    .toLowerCase()
    .max(80, { error: "Admite hasta 80 caracteres." })
    .regex(PERMISSION_KEY_PATTERN, { error: 'Usa el formato "modulo.accion" (minúsculas, sin espacios).' }),
  name: name("El nombre", 120),
  module: name("El módulo", 60),
  description: optionalText(255),
});

export const integrationSchema = z.object({
  provider: z.string().refine(isProviderId, { error: "Ese proveedor no está disponible." }),
  // Vacío = usar el nombre de la cuenta que devuelva el proveedor.
  name: z.union([z.literal(""), name("El nombre", 120)]),
  // Vacío = buscarlo con la api_key (si el proveedor lo permite). El formato de cada
  // proveedor se valida aparte (catálogo: normalize + pattern).
  externalId: z.string().trim().max(120, { error: "Admite hasta 120 caracteres." }),
  // Vacíos al editar = conservar los guardados.
  apiKey: z.string().trim().max(500, { error: "Admite hasta 500 caracteres." }),
  apiSecret: z.string().trim().max(500, { error: "Admite hasta 500 caracteres." }),
  active: z.boolean(),
});

/** Convierte los errores de Zod en { campo: primer mensaje }. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const { fieldErrors } = z.flattenError(error);
  return Object.fromEntries(
    Object.entries(fieldErrors as Record<string, string[] | undefined>)
      .filter(([, messages]) => messages?.length)
      .map(([field, messages]) => [field, messages![0]]),
  );
}
