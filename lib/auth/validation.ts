export type FieldErrors<K extends string> = Partial<Record<K, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD_LENGTH = 8;

function validateEmail(email: string): string | undefined {
  if (!email) return "Ingresa tu correo.";
  if (!EMAIL_PATTERN.test(email)) return "Ingresa un correo válido.";
}

export function validateLogin(input: { email: string; password: string }) {
  const errors: FieldErrors<"email" | "password"> = {};
  const email = validateEmail(input.email);
  if (email) errors.email = email;
  if (!input.password) errors.password = "Ingresa tu contraseña.";
  return errors;
}

export function validateRegister(input: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
}) {
  const errors: FieldErrors<"name" | "email" | "password" | "confirmPassword" | "terms"> = {};
  if (input.name.trim().length < 2) errors.name = "Ingresa tu nombre (mínimo 2 caracteres).";
  const email = validateEmail(input.email);
  if (email) errors.email = email;
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (input.confirmPassword !== input.password) errors.confirmPassword = "Las contraseñas no coinciden.";
  if (!input.terms) errors.terms = "Debes aceptar los términos para continuar.";
  return errors;
}

export const hasErrors = (errors: object) => Object.keys(errors).length > 0;
