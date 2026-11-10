"use client";

import { Fragment, useDeferredValue, useState } from "react";
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CFormInput,
  CFormSelect,
  CModal,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilLockLocked, cilPencil, cilPlus, cilSearch, cilTrash } from "@coreui/icons";
import { deletePermissionAction } from "@/app/(dashboard)/dashboard/permisos/actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { groupByModule } from "@/lib/group-by-module";
import type { PermissionRow } from "@/lib/server/admin-queries";
import { PermissionForm } from "./permission-form";

export function PermissionsManager({ permissions }: { permissions: PermissionRow[] }) {
  const { can } = useSession();
  const notify = useToast();
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PermissionRow | null>(null);
  const [deleting, setDeleting] = useState<PermissionRow | null>(null);

  const canCreate = can(PERMISSIONS.PERMISSIONS_CREATE);
  const canUpdate = can(PERMISSIONS.PERMISSIONS_UPDATE);
  const canDelete = can(PERMISSIONS.PERMISSIONS_DELETE);

  const modules = [...new Set(permissions.map((permission) => permission.module))];
  const visible = permissions.filter(
    (permission) =>
      (!moduleFilter || permission.module === moduleFilter) &&
      (!deferredQuery || `${permission.key} ${permission.name} ${permission.description ?? ""}`.toLowerCase().includes(deferredQuery)),
  );
  const groups = groupByModule(visible);

  function openForm(permission: PermissionRow | null) {
    setEditing(permission);
    setFormOpen(true);
  }

  return (
    <>
      <CCard>
        <CCardBody>
          <div className="admin-toolbar">
            <div className="admin-search">
              <CIcon icon={cilSearch} />
              <CFormInput
                type="search"
                placeholder="Buscar por clave, nombre o descripción…"
                aria-label="Buscar permisos"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <CFormSelect aria-label="Filtrar por módulo" className="admin-filter" value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}>
              <option value="">Todos los módulos</option>
              {modules.map((module) => (
                <option key={module} value={module}>
                  {module}
                </option>
              ))}
            </CFormSelect>
            {canCreate && (
              <CButton color="primary" className="ms-lg-auto d-inline-flex align-items-center gap-2" onClick={() => openForm(null)}>
                <CIcon icon={cilPlus} />
                Nuevo permiso
              </CButton>
            )}
          </div>

          <CTable className="table-admin" align="middle" responsive>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell scope="col">Permiso</CTableHeaderCell>
                <CTableHeaderCell scope="col">Clave</CTableHeaderCell>
                <CTableHeaderCell scope="col">Roles</CTableHeaderCell>
                {(canUpdate || canDelete) && (
                  <CTableHeaderCell scope="col" className="text-end">
                    <span className="visually-hidden">Acciones</span>
                  </CTableHeaderCell>
                )}
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {groups.length === 0 && (
                <CTableRow>
                  <CTableDataCell colSpan={4} className="text-center text-body-secondary py-5">
                    Ningún permiso coincide con la búsqueda.
                  </CTableDataCell>
                </CTableRow>
              )}
              {groups.map((group) => (
                <Fragment key={group.module}>
                  <CTableRow className="table-group-row">
                    <CTableHeaderCell colSpan={4} scope="colgroup">
                      {group.module} <span className="text-body-tertiary fw-normal">· {group.items.length}</span>
                    </CTableHeaderCell>
                  </CTableRow>
                  {group.items.map((permission) => (
                    <CTableRow key={permission.id}>
                      <CTableDataCell>
                        <div className="fw-semibold text-body-emphasis">
                          {permission.name}
                          {permission.isSystem && (
                            <CBadge className="ms-2 bg-secondary-subtle text-secondary-emphasis" title="Permiso de sistema">
                              <CIcon icon={cilLockLocked} size="sm" /> Sistema
                            </CBadge>
                          )}
                        </div>
                        {permission.description && <div className="small text-body-secondary">{permission.description}</div>}
                      </CTableDataCell>
                      <CTableDataCell>
                        <code>{permission.key}</code>
                      </CTableDataCell>
                      <CTableDataCell>
                        <CBadge className="bg-primary-subtle text-primary-emphasis">{permission.roleCount}</CBadge>
                      </CTableDataCell>
                      {(canUpdate || canDelete) && (
                        <CTableDataCell className="text-end text-nowrap">
                          {canUpdate && (
                            <CButton size="sm" variant="ghost" color="secondary" title="Editar" aria-label={`Editar ${permission.name}`} onClick={() => openForm(permission)}>
                              <CIcon icon={cilPencil} />
                            </CButton>
                          )}
                          {canDelete && (
                            <CButton
                              size="sm"
                              variant="ghost"
                              color="danger"
                              disabled={permission.isSystem}
                              title={permission.isSystem ? "Los permisos de sistema no se pueden eliminar" : "Eliminar"}
                              aria-label={`Eliminar ${permission.name}`}
                              onClick={() => setDeleting(permission)}
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
                          )}
                        </CTableDataCell>
                      )}
                    </CTableRow>
                  ))}
                </Fragment>
              ))}
            </CTableBody>
          </CTable>
          <div className="admin-footer">
            <span className="small text-body-secondary">
              {visible.length} de {permissions.length} permisos · {modules.length} módulos
            </span>
          </div>
        </CCardBody>
      </CCard>

      <CModal visible={formOpen} onClose={() => setFormOpen(false)} alignment="center" aria-labelledby="permission-form-title">
        <PermissionForm
          permission={editing}
          modules={modules}
          onCancel={() => setFormOpen(false)}
          onSaved={(message) => {
            setFormOpen(false);
            notify(message);
          }}
        />
      </CModal>

      <ConfirmDialog
        visible={deleting !== null}
        title="Eliminar permiso"
        confirmLabel="Eliminar"
        onClose={() => setDeleting(null)}
        onConfirm={() => deletePermissionAction(deleting!.id)}
        onDone={(result) => {
          setDeleting(null);
          if (result.message) notify(result.message);
        }}
      >
        <p className="mb-0">
          Se eliminará <strong>{deleting?.name}</strong> (<code>{deleting?.key}</code>)
          {deleting && deleting.roleCount > 0 ? ` y se quitará de ${deleting.roleCount} ${deleting.roleCount === 1 ? "rol" : "roles"}` : ""}. Esta acción no se puede deshacer.
        </p>
      </ConfirmDialog>
    </>
  );
}
