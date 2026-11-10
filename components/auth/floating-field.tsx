"use client";

import { forwardRef } from "react";
import { CFormInput } from "@coreui/react";

type FloatingFieldProps = {
  id: string;
  name: string;
  label: string;
  type?: "text" | "email";
  autoComplete?: string;
  defaultValue?: string;
  error?: string;
  className?: string;
};

/** Input con label flotante de CoreUI (`floatingLabel`) y su mensaje de validación. */
export const FloatingField = forwardRef<HTMLInputElement, FloatingFieldProps>(function FloatingField(
  { id, name, label, type = "text", autoComplete, defaultValue, error, className },
  ref,
) {
  return (
    <CFormInput
      ref={ref}
      id={id}
      name={name}
      type={type}
      // El placeholder es obligatorio: el label flotante depende de :placeholder-shown.
      placeholder={label}
      floatingLabel={label}
      floatingClassName={className}
      autoComplete={autoComplete}
      defaultValue={defaultValue}
      invalid={Boolean(error)}
      feedbackInvalid={error}
      aria-describedby={error ? `${id}-feedback` : undefined}
    />
  );
});
