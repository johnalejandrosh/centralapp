"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import {
  CAlert,
  CButton,
  CCol,
  CForm,
  CFormInput,
  CFormTextarea,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
} from "@coreui/react";
import { savePermissionAction, type PermissionField } from "@/app/(dashboard)/dashboard/permisos/actions";
import type { ActionResult } from "@/lib/actions";
import type { PermissionRow } from "@/lib/server/admin-queries";

type PermissionFormProps = {
  permission: PermissionRow | null;
  modules: string[];
  onSaved: (message: string) => void;
  onCancel: () => void;
};

const idle: ActionResult<PermissionField> = { ok: false };

export function PermissionForm({ permission, modules, onSaved, onCancel }: PermissionFormProps) {
  const [state, formAction, pending] = useActionState(async (previous: ActionResult<PermissionField>, formData: FormData) => {
    const result = await savePermissionAction(previous, formData);
    if (result.ok) onSaved(result.message ?? "Cambios guardados.");
    return result;
  }, idle);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const errors = state.fieldErrors ?? {};
  const isSystem = Boolean(permission?.isSystem);

  return (
    <CForm onSubmit={submit} noValidate>
      <CModalHeader>
        <CModalTitle id="permission-form-title">{permission ? "Editar permiso" : "Nuevo permiso"}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {state.message && !state.ok && (
          <CAlert color="danger" className="py-2 small">
            {state.message}
          </CAlert>
        )}
        {permission && <input type="hidden" name="id" value={permission.id} />}

        <CRow className="g-3">
          <CCol md={7}>
            <CFormInput
              id="permission-key"
              name="key"
              label="Clave"
              placeholder="reportes.exportar"
              defaultValue={permission?.key}
              readOnly={isSystem}
              className="font-monospace"
              autoComplete="off"
              text={isSystem ? "Permiso de sistema: la aplicación lo consulta por esta clave." : 'Formato "modulo.accion", en minúsculas.'}
              invalid={Boolean(errors.key)}
              feedbackInvalid={errors.key}
            />
          </CCol>
          <CCol md={5}>
            <CFormInput
              id="permission-module"
              name="module"
              label="Módulo"
              list="permission-modules"
              placeholder="Reportes"
              defaultValue={permission?.module}
              autoComplete="off"
              invalid={Boolean(errors.module)}
              feedbackInvalid={errors.module}
            />
            <datalist id="permission-modules">
              {modules.map((module) => (
                <option key={module} value={module} />
              ))}
            </datalist>
          </CCol>
          <CCol xs={12}>
            <CFormInput
              id="permission-name"
              name="name"
              label="Nombre"
              placeholder="Exportar reportes"
              defaultValue={permission?.name}
              invalid={Boolean(errors.name)}
              feedbackInvalid={errors.name}
            />
          </CCol>
          <CCol xs={12}>
            <CFormTextarea
              id="permission-description"
              name="description"
              label="Descripción"
              rows={2}
              defaultValue={permission?.description ?? ""}
              invalid={Boolean(errors.description)}
              feedbackInvalid={errors.description}
            />
          </CCol>
        </CRow>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancelar
        </CButton>
        <CButton type="submit" color="primary" disabled={pending}>
          {pending && <CSpinner size="sm" className="me-2" aria-hidden />}
          {permission ? "Guardar cambios" : "Crear permiso"}
        </CButton>
      </CModalFooter>
    </CForm>
  );
}
