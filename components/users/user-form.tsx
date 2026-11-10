"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import {
  CAlert,
  CButton,
  CCol,
  CForm,
  CFormInput,
  CFormSelect,
  CFormSwitch,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
} from "@coreui/react";
import { saveUserAction, type UserField } from "@/app/(dashboard)/dashboard/usuarios/actions";
import type { ActionResult } from "@/lib/actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/validation";
import type { RoleOption, UserRow } from "@/lib/server/admin-queries";

type UserFormProps = {
  user: UserRow | null;
  roles: RoleOption[];
  isSelf: boolean;
  onSaved: (message: string) => void;
  onCancel: () => void;
};

const idle: ActionResult<UserField> = { ok: false };

/** Contenido del modal de alta/edición. Se monta al abrir: cada apertura empieza limpia. */
export function UserForm({ user, roles, isSelf, onSaved, onCancel }: UserFormProps) {
  const [state, formAction, pending] = useActionState(async (previous: ActionResult<UserField>, formData: FormData) => {
    const result = await saveUserAction(previous, formData);
    if (result.ok) onSaved(result.message ?? "Cambios guardados.");
    return result;
  }, idle);

  // Se envía a mano (no con `action`) para que React no limpie lo escrito si hay errores.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const errors = state.fieldErrors ?? {};

  return (
    <CForm onSubmit={submit} noValidate>
      <CModalHeader>
        <CModalTitle id="user-form-title">{user ? "Editar usuario" : "Nuevo usuario"}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {state.message && !state.ok && (
          <CAlert color="danger" className="py-2 small">
            {state.message}
          </CAlert>
        )}
        {user && <input type="hidden" name="id" value={user.id} />}

        <CRow className="g-3">
          <CCol xs={12}>
            <CFormInput
              id="user-name"
              name="name"
              label="Nombre completo"
              defaultValue={user?.name}
              autoComplete="off"
              invalid={Boolean(errors.name)}
              feedbackInvalid={errors.name}
            />
          </CCol>
          <CCol xs={12}>
            <CFormInput
              id="user-email"
              name="email"
              type="email"
              label="Correo electrónico"
              defaultValue={user?.email}
              autoComplete="off"
              invalid={Boolean(errors.email)}
              feedbackInvalid={errors.email}
            />
          </CCol>
          <CCol md={6}>
            <CFormSelect
              id="user-role"
              name="roleId"
              label="Rol"
              defaultValue={user?.role.id ?? roles.find((role) => !role.isSystem)?.id}
              invalid={Boolean(errors.roleId)}
              feedbackInvalid={errors.roleId}
              disabled={isSelf}
              text={isSelf ? "No puedes cambiar tu propio rol." : undefined}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </CFormSelect>
            {/* Un select deshabilitado no se envía: se manda el valor actual. */}
            {isSelf && user && <input type="hidden" name="roleId" value={user.role.id} />}
          </CCol>
          <CCol md={6}>
            <CFormInput
              id="user-password"
              name="password"
              type="password"
              label={user ? "Nueva contraseña" : "Contraseña"}
              autoComplete="new-password"
              text={user ? "Déjala vacía para conservar la actual." : `Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}
              invalid={Boolean(errors.password)}
              feedbackInvalid={errors.password}
            />
          </CCol>
          <CCol xs={12}>
            <CFormSwitch
              id="user-active"
              name="active"
              label="Cuenta activa (puede iniciar sesión)"
              defaultChecked={user?.active ?? true}
              disabled={isSelf}
              invalid={Boolean(errors.active)}
            />
            {errors.active && <div className="invalid-feedback d-block">{errors.active}</div>}
            {isSelf && <input type="hidden" name="active" value="on" />}
          </CCol>
        </CRow>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancelar
        </CButton>
        <CButton type="submit" color="primary" disabled={pending}>
          {pending && <CSpinner size="sm" className="me-2" aria-hidden />}
          {user ? "Guardar cambios" : "Crear usuario"}
        </CButton>
      </CModalFooter>
    </CForm>
  );
}
