"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CAlert, CButton, CForm, CFormCheck, CSpinner } from "@coreui/react";
import { registerAction, type RegisterState } from "@/app/(auth)/actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/validation";
import { FloatingField } from "./floating-field";
import { PasswordField } from "./password-field";

const initialState: RegisterState = { values: { name: "", email: "", terms: false }, fieldErrors: {} };

const STRENGTH_LABELS = ["", "Débil", "Aceptable", "Buena", "Fuerte"];

/** Puntaje 0–4: longitud mínima, mayúsculas y minúsculas, números y símbolos. */
function passwordScore(password: string): number {
  if (!password) return 0;
  if (password.length < MIN_PASSWORD_LENGTH) return 1;
  const checks = [/[a-z]/.test(password) && /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)];
  return 1 + checks.filter(Boolean).length;
}

export function RegisterForm() {
  const [score, setScore] = useState(0);
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  const { fieldErrors } = state;

  return (
    <>
      <p className="eyebrow mb-2">Registro</p>
      <h1 className="h2 mb-2">Crea tu cuenta</h1>
      <p className="text-body-secondary mb-4">Configura tu espacio de trabajo en menos de un minuto.</p>

      {/* React limpia los campos tras cada envío; el medidor se reinicia con ellos. */}
      <CForm action={formAction} noValidate onReset={() => setScore(0)}>
        {state.formError && (
          <CAlert color="danger" className="py-2 small" role="alert">
            {state.formError}
          </CAlert>
        )}

        <FloatingField
          id="register-name"
          name="name"
          label="Nombre completo"
          autoComplete="name"
          defaultValue={state.values.name}
          error={fieldErrors.name}
          className="mb-3"
        />
        <FloatingField
          id="register-email"
          name="email"
          type="email"
          label="Correo de trabajo"
          autoComplete="email"
          defaultValue={state.values.email}
          error={fieldErrors.email}
          className="mb-3"
        />
        <PasswordField
          id="register-password"
          name="password"
          label="Contraseña"
          autoComplete="new-password"
          error={fieldErrors.password}
          className="mb-3"
          onChange={(event) => setScore(passwordScore(event.target.value))}
        >
          <div className="password-strength" data-score={score} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="d-flex justify-content-between small mt-1">
            <span className="text-body-secondary">Mínimo {MIN_PASSWORD_LENGTH} caracteres; mezcla letras, números y símbolos.</span>
            <span className="fw-semibold text-nowrap ms-2" aria-live="polite">
              {STRENGTH_LABELS[score]}
            </span>
          </div>
        </PasswordField>
        <PasswordField
          id="register-confirm-password"
          name="confirmPassword"
          label="Repite la contraseña"
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
          className="mb-3"
        />
        <CFormCheck
          id="register-terms"
          name="terms"
          label="Acepto los términos de uso y la política de privacidad"
          defaultChecked={state.values.terms}
          invalid={Boolean(fieldErrors.terms)}
          feedbackInvalid={fieldErrors.terms}
          className="mb-4"
        />

        <CButton type="submit" color="primary" size="lg" className="w-100" disabled={pending}>
          {pending && <CSpinner size="sm" className="me-2" aria-hidden />}
          {pending ? "Creando cuenta…" : "Crear cuenta"}
        </CButton>
      </CForm>

      <p className="text-center text-body-secondary mt-4 mb-0">
        ¿Ya tienes cuenta? <Link href="/login" className="fw-semibold">Inicia sesión</Link>
      </p>
    </>
  );
}
