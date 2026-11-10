"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import {
  CAlert,
  CButton,
  CForm,
  CFormCheck,
  CFormInput,
  CFormTextarea,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from "@coreui/react";
import { saveRoleAction, type RoleField } from "@/app/(dashboard)/dashboard/roles/actions";
import type { ActionResult } from "@/lib/actions";
import { groupByModule } from "@/lib/group-by-module";
import type { PermissionRow, RoleRow } from "@/lib/server/admin-queries";

type RoleFormProps = {
  role: RoleRow | null;
  permissions: PermissionRow[];
  onSaved: (message: string) => void;
  onCancel: () => void;
};

const idle: ActionResult<RoleField> = { ok: false };

export function RoleForm({ role, permissions, onSaved, onCancel }: RoleFormProps) {
  const [selected, setSelected] = useState(() => new Set(role?.permissionIds ?? []));
  const [state, formAction, pending] = useActionState(async (previous: ActionResult<RoleField>, formData: FormData) => {
    const result = await saveRoleAction(previous, formData);
    if (result.ok) onSaved(result.message ?? "Cambios guardados.");
    return result;
  }, idle);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  function toggle(ids: string[], checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  const errors = state.fieldErrors ?? {};
  const isSystem = Boolean(role?.isSystem);
  const groups = groupByModule(permissions);

  return (
    <CForm onSubmit={submit} noValidate>
      <CModalHeader>
        <CModalTitle id="role-form-title">{role ? `Editar rol: ${role.name}` : "Nuevo rol"}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {state.message && !state.ok && (
          <CAlert color="danger" className="py-2 small">
            {state.message}
          </CAlert>
        )}
        {role && <input type="hidden" name="id" value={role.id} />}

        <div className="d-grid gap-3 mb-4">
          <CFormInput
            id="role-name"
            name="name"
            label="Nombre"
            defaultValue={role?.name}
            readOnly={isSystem}
            text={isSystem ? "El rol de sistema conserva su nombre." : undefined}
            invalid={Boolean(errors.name)}
            feedbackInvalid={errors.name}
          />
          <CFormTextarea
            id="role-description"
            name="description"
            label="Descripción"
            rows={2}
            defaultValue={role?.description ?? ""}
            placeholder="¿Para quién es este rol?"
            invalid={Boolean(errors.description)}
            feedbackInvalid={errors.description}
          />
        </div>

        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="h6 mb-0">Permisos</h3>
          {!isSystem && (
            <span className="small text-body-secondary">
              {selected.size} de {permissions.length} seleccionados
            </span>
          )}
        </div>

        {isSystem ? (
          <CAlert color="primary" className="small mb-0">
            Este rol tiene <strong>acceso total</strong> a la plataforma, incluidos los permisos que se creen en el futuro.
          </CAlert>
        ) : (
          <div className="permission-matrix">
            {groups.map((group) => {
              const ids = group.items.map((permission) => permission.id);
              const checkedCount = ids.filter((id) => selected.has(id)).length;
              const moduleId = `module-${group.module.replace(/\W+/g, "-").toLowerCase()}`;
              return (
                <fieldset key={group.module} className="permission-matrix__group">
                  <legend className="permission-matrix__legend">
                    <CFormCheck
                      id={moduleId}
                      label={group.module}
                      checked={checkedCount === ids.length}
                      indeterminate={checkedCount > 0 && checkedCount < ids.length}
                      onChange={(event) => toggle(ids, event.target.checked)}
                    />
                    <span className="small text-body-tertiary">
                      {checkedCount}/{ids.length}
                    </span>
                  </legend>
                  <div className="permission-matrix__items">
                    {group.items.map((permission) => (
                      <CFormCheck
                        key={permission.id}
                        id={`perm-${permission.id}`}
                        name="permissionIds"
                        value={permission.id}
                        checked={selected.has(permission.id)}
                        onChange={(event) => toggle([permission.id], event.target.checked)}
                        label={
                          <>
                            {permission.name} <code className="small">{permission.key}</code>
                          </>
                        }
                      />
                    ))}
                  </div>
                </fieldset>
              );
            })}
          </div>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancelar
        </CButton>
        <CButton type="submit" color="primary" disabled={pending}>
          {pending && <CSpinner size="sm" className="me-2" aria-hidden />}
          {role ? "Guardar cambios" : "Crear rol"}
        </CButton>
      </CModalFooter>
    </CForm>
  );
}
