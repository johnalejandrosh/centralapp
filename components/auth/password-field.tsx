"use client";

import { forwardRef, useState, type ChangeEventHandler, type ReactNode } from "react";
import { CFormInput } from "@coreui/react";

type PasswordFieldProps = {
  id: string;
  name: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  error?: string;
  className?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  /** Contenido extra bajo el campo (p. ej. medidor de fuerza). */
  children?: ReactNode;
};

/** Contraseña con label flotante y botón Ver/Ocultar dentro del campo. */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { id, name, label, autoComplete, error, className = "", onChange, children },
  ref,
) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={className}>
      <div className="password-field">
        <CFormInput
          ref={ref}
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          placeholder={label}
          floatingLabel={label}
          autoComplete={autoComplete}
          invalid={Boolean(error)}
          feedbackInvalid={error}
          aria-describedby={error ? `${id}-feedback` : undefined}
          onChange={onChange}
        />
        <button
          type="button"
          className="password-field__toggle"
          onClick={() => setVisible((value) => !value)}
          aria-controls={id}
          aria-pressed={visible}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {visible ? "Ocultar" : "Ver"}
        </button>
      </div>
      {children}
    </div>
  );
});
