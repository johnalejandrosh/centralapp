"use client";

import { useState } from "react";
import { CBadge, CButton, CCard, CCardBody, CCol, CModal, CRow } from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilPencil, cilPeople, cilPlus, cilShieldAlt, cilTrash } from "@coreui/icons";
import { deleteRoleAction } from "@/app/(dashboard)/dashboard/roles/actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { PermissionRow, RoleRow } from "@/lib/server/admin-queries";
import { RoleForm } from "./role-form";

export function RolesManager({ roles, permissions }: { roles: RoleRow[]; permissions: PermissionRow[] }) {
  const { can } = useSession();
  const notify = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [deleting, setDeleting] = useState<RoleRow | null>(null);

  const canCreate = can(PERMISSIONS.ROLES_CREATE);
  const canUpdate = can(PERMISSIONS.ROLES_UPDATE);
  const canDelete = can(PERMISSIONS.ROLES_DELETE);
  const moduleOf = new Map(permissions.map((permission) => [permission.id, permission.module]));

  function openForm(role: RoleRow | null) {
    setEditing(role);
    setFormOpen(true);
  }

  return (
    <>
      <CRow xs={{ cols: 1, gutter: 3 }} md={{ cols: 2 }} xl={{ cols: 3 }}>
        {roles.map((role) => {
          const modules = [...new Set(role.permissionIds.map((id) => moduleOf.get(id)).filter(Boolean))] as string[];
          const deleteBlocked = role.isSystem ? "El rol de sistema no se puede eliminar" : role.userCount > 0 ? "Tiene usuarios asignados" : "";
          return (
            <CCol key={role.id}>
              <CCard className="role-card h-100">
                <CCardBody className="d-flex flex-column">
                  <div className="d-flex align-items-start gap-3">
                    <span className={`role-card__icon ${role.isSystem ? "is-system" : ""}`}>
                      <CIcon icon={cilShieldAlt} />
                    </span>
                    <div className="min-w-0 flex-grow-1">
                      <h2 className="role-card__title">
                        {role.name}
                        {role.isSystem && <CBadge className="ms-2 bg-primary-subtle text-primary-emphasis">Sistema</CBadge>}
                      </h2>
                      <p className="role-card__desc">{role.description || "Sin descripción."}</p>
                    </div>
                  </div>

                  <div className="role-card__stats">
                    <span>
                      <CIcon icon={cilPeople} size="sm" /> {role.userCount} {role.userCount === 1 ? "usuario" : "usuarios"}
                    </span>
                    <span>{role.isSystem ? "Acceso total" : `${role.permissionIds.length} permisos`}</span>
                  </div>

                  <div className="role-card__modules">
                    {role.isSystem ? (
                      <CBadge className="bg-primary-subtle text-primary-emphasis">Todos los módulos</CBadge>
                    ) : modules.length === 0 ? (
                      <span className="small text-body-tertiary">Sin permisos asignados</span>
                    ) : (
                      modules.map((module) => (
                        <CBadge key={module} className="bg-secondary-subtle text-secondary-emphasis">
                          {module}
                        </CBadge>
                      ))
                    )}
                  </div>

                  {(canUpdate || canDelete) && (
                    <div className="role-card__actions">
                      {canUpdate && (
                        <CButton size="sm" color="secondary" variant="outline" onClick={() => openForm(role)} aria-label={`Editar rol ${role.name}`}>
                          <CIcon icon={cilPencil} className="me-1" /> Editar
                        </CButton>
                      )}
                      {canDelete && (
                        <CButton
                          size="sm"
                          color="danger"
                          variant="ghost"
                          disabled={Boolean(deleteBlocked)}
                          title={deleteBlocked || "Eliminar"}
                          onClick={() => setDeleting(role)}
                          aria-label={`Eliminar rol ${role.name}`}
                        >
                          <CIcon icon={cilTrash} />
                        </CButton>
                      )}
                    </div>
                  )}
                </CCardBody>
              </CCard>
            </CCol>
          );
        })}

        {canCreate && (
          <CCol>
            <button type="button" className="role-card-new" onClick={() => openForm(null)}>
              <CIcon icon={cilPlus} size="xl" />
              <span className="fw-semibold">Nuevo rol</span>
              <span className="small text-body-secondary">Agrupa permisos para asignarlos a varios usuarios.</span>
            </button>
          </CCol>
        )}
      </CRow>

      <CModal visible={formOpen} onClose={() => setFormOpen(false)} alignment="center" size="lg" scrollable aria-labelledby="role-form-title">
        <RoleForm
          role={editing}
          permissions={permissions}
          onCancel={() => setFormOpen(false)}
          onSaved={(message) => {
            setFormOpen(false);
            notify(message);
          }}
        />
      </CModal>

      <ConfirmDialog
        visible={deleting !== null}
        title="Eliminar rol"
        confirmLabel="Eliminar"
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteRoleAction(deleting!.id)}
        onDone={(result) => {
          setDeleting(null);
          if (result.message) notify(result.message);
        }}
      >
        <p className="mb-0">
          Se eliminará el rol <strong>{deleting?.name}</strong> y sus asignaciones de permisos. Esta acción no se puede deshacer.
        </p>
      </ConfirmDialog>
    </>
  );
}
