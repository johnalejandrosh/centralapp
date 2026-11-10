"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CAvatar,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CFormInput,
  CFormSelect,
  CModal,
  CPagination,
  CPaginationItem,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilBan, cilCheckCircle, cilPencil, cilPlus, cilSearch, cilTrash } from "@coreui/icons";
import { deleteUserAction, toggleUserActiveAction } from "@/app/(dashboard)/dashboard/usuarios/actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { LocalDate } from "@/components/admin/local-date";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { initials } from "@/lib/initials";
import type { RoleOption, UserFilters, UserRow } from "@/lib/server/admin-queries";
import { UserForm } from "./user-form";

type UsersManagerProps = {
  users: UserRow[];
  total: number;
  pageCount: number;
  pageSize: number;
  filters: UserFilters;
  roles: RoleOption[];
};

type PendingAction = { kind: "delete" | "toggle"; user: UserRow } | null;

export function UsersManager({ users, total, pageCount, pageSize, filters, roles }: UsersManagerProps) {
  const { user: me, can } = useSession();
  const notify = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [navigating, startNavigation] = useTransition();

  const [query, setQuery] = useState(filters.q);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const canCreate = can(PERMISSIONS.USERS_CREATE);
  const canUpdate = can(PERMISSIONS.USERS_UPDATE);
  const canDelete = can(PERMISSIONS.USERS_DELETE);

  /** Construye la URL con los filtros; cambiar un filtro vuelve a la página 1. */
  function hrefWith(changes: Partial<Record<"q" | "rol" | "estado" | "pagina", string>>) {
    const params = new URLSearchParams();
    const next = { q: filters.q, rol: filters.roleId, estado: filters.status, pagina: "", ...changes };
    for (const [key, value] of Object.entries(next)) {
      if (value && !(key === "pagina" && value === "1")) params.set(key, value);
    }
    const search = params.toString();
    return search ? `${pathname}?${search}` : pathname;
  }

  function navigate(changes: Parameters<typeof hrefWith>[0]) {
    startNavigation(() => router.replace(hrefWith(changes), { scroll: false }));
  }

  function onSearchChange(value: string) {
    setQuery(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => navigate({ q: value.trim() }), 350);
  }

  function openForm(user: UserRow | null) {
    setEditing(user);
    setFormOpen(true);
  }

  const from = total === 0 ? 0 : (filters.page - 1) * pageSize + 1;
  const to = Math.min(filters.page * pageSize, total);
  const hasFilters = Boolean(filters.q || filters.roleId || filters.status);

  return (
    <>
      <CCard>
        <CCardBody>
          <div className="admin-toolbar">
            <div className="admin-search">
              <CIcon icon={cilSearch} />
              <CFormInput
                type="search"
                placeholder="Buscar por nombre o correo…"
                aria-label="Buscar usuarios"
                value={query}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </div>
            <CFormSelect
              aria-label="Filtrar por rol"
              className="admin-filter"
              value={filters.roleId}
              onChange={(event) => navigate({ rol: event.target.value })}
            >
              <option value="">Todos los roles</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </CFormSelect>
            <CFormSelect
              aria-label="Filtrar por estado"
              className="admin-filter"
              value={filters.status}
              onChange={(event) => navigate({ estado: event.target.value })}
            >
              <option value="">Todos los estados</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </CFormSelect>
            {hasFilters && (
              <CButton
                color="secondary"
                variant="ghost"
                onClick={() => {
                  setQuery("");
                  startNavigation(() => router.replace(pathname, { scroll: false }));
                }}
              >
                Limpiar
              </CButton>
            )}
            {canCreate && (
              <CButton color="primary" className="ms-lg-auto d-inline-flex align-items-center gap-2" onClick={() => openForm(null)}>
                <CIcon icon={cilPlus} />
                Nuevo usuario
              </CButton>
            )}
          </div>

          <div className={`admin-table-wrap ${navigating ? "is-loading" : ""}`} aria-busy={navigating}>
            <CTable className="table-admin" align="middle" hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell scope="col">Usuario</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Rol</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Estado</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Último acceso</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Creado</CTableHeaderCell>
                  {(canUpdate || canDelete) && (
                    <CTableHeaderCell scope="col" className="text-end">
                      <span className="visually-hidden">Acciones</span>
                    </CTableHeaderCell>
                  )}
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {users.length === 0 && (
                  <CTableRow>
                    <CTableDataCell colSpan={6} className="text-center text-body-secondary py-5">
                      {hasFilters ? "Ningún usuario coincide con los filtros." : "Todavía no hay usuarios."}
                    </CTableDataCell>
                  </CTableRow>
                )}
                {users.map((user) => {
                  const isSelf = user.id === me.id;
                  return (
                    <CTableRow key={user.id}>
                      <CTableDataCell>
                        <div className="d-flex align-items-center gap-3">
                          <CAvatar size="md" className={user.active ? "avatar-brand" : "bg-body-secondary text-body-secondary fw-semibold"}>
                            {initials(user.name)}
                          </CAvatar>
                          <div className="min-w-0">
                            <div className="fw-semibold text-body-emphasis">
                              {user.name}
                              {isSelf && <CBadge className="ms-2 bg-primary-subtle text-primary-emphasis">Tú</CBadge>}
                            </div>
                            <div className="small text-body-secondary text-truncate">{user.email}</div>
                          </div>
                        </div>
                      </CTableDataCell>
                      <CTableDataCell>
                        <CBadge className={user.role.isSystem ? "bg-primary-subtle text-primary-emphasis" : "bg-secondary-subtle text-secondary-emphasis"}>
                          {user.role.name}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell>
                        <span className={`status-dot ${user.active ? "is-active" : ""}`}>{user.active ? "Activo" : "Inactivo"}</span>
                      </CTableDataCell>
                      <CTableDataCell className="text-body-secondary small">
                        <LocalDate iso={user.lastLoginAt} fallback="Nunca" />
                      </CTableDataCell>
                      <CTableDataCell className="text-body-secondary small">
                        <LocalDate iso={user.createdAt} />
                      </CTableDataCell>
                      {(canUpdate || canDelete) && (
                        <CTableDataCell className="text-end text-nowrap">
                          {canUpdate && (
                            <>
                              <CButton size="sm" variant="ghost" color="secondary" title="Editar" aria-label={`Editar a ${user.name}`} onClick={() => openForm(user)}>
                                <CIcon icon={cilPencil} />
                              </CButton>
                              <CButton
                                size="sm"
                                variant="ghost"
                                color="secondary"
                                title={isSelf ? "No puedes desactivar tu cuenta" : user.active ? "Desactivar" : "Activar"}
                                aria-label={`${user.active ? "Desactivar" : "Activar"} a ${user.name}`}
                                disabled={isSelf}
                                onClick={() => setPendingAction({ kind: "toggle", user })}
                              >
                                <CIcon icon={user.active ? cilBan : cilCheckCircle} />
                              </CButton>
                            </>
                          )}
                          {canDelete && (
                            <CButton
                              size="sm"
                              variant="ghost"
                              color="danger"
                              title={isSelf ? "No puedes eliminar tu cuenta" : "Eliminar"}
                              aria-label={`Eliminar a ${user.name}`}
                              disabled={isSelf}
                              onClick={() => setPendingAction({ kind: "delete", user })}
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
                          )}
                        </CTableDataCell>
                      )}
                    </CTableRow>
                  );
                })}
              </CTableBody>
            </CTable>
          </div>

          <div className="admin-footer">
            <span className="small text-body-secondary">
              {total === 0 ? "0 usuarios" : `Mostrando ${from}–${to} de ${total} ${total === 1 ? "usuario" : "usuarios"}`}
            </span>
            {pageCount > 1 && (
              <CPagination aria-label="Paginación de usuarios" className="mb-0">
                <CPaginationItem as={Link} href={hrefWith({ pagina: String(filters.page - 1) })} disabled={filters.page <= 1} aria-label="Anterior">
                  ‹
                </CPaginationItem>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
                  <CPaginationItem key={page} as={Link} href={hrefWith({ pagina: String(page) })} active={page === filters.page}>
                    {page}
                  </CPaginationItem>
                ))}
                <CPaginationItem as={Link} href={hrefWith({ pagina: String(filters.page + 1) })} disabled={filters.page >= pageCount} aria-label="Siguiente">
                  ›
                </CPaginationItem>
              </CPagination>
            )}
          </div>
        </CCardBody>
      </CCard>

      <CModal visible={formOpen} onClose={() => setFormOpen(false)} alignment="center" aria-labelledby="user-form-title">
        <UserForm
          user={editing}
          roles={roles}
          isSelf={editing?.id === me.id}
          onCancel={() => setFormOpen(false)}
          onSaved={(message) => {
            setFormOpen(false);
            notify(message);
          }}
        />
      </CModal>

      <ConfirmDialog
        visible={pendingAction !== null}
        title={pendingAction?.kind === "delete" ? "Eliminar usuario" : pendingAction?.user.active ? "Desactivar usuario" : "Activar usuario"}
        confirmLabel={pendingAction?.kind === "delete" ? "Eliminar" : pendingAction?.user.active ? "Desactivar" : "Activar"}
        tone={pendingAction?.kind === "delete" || pendingAction?.user.active ? "danger" : "primary"}
        onClose={() => setPendingAction(null)}
        onConfirm={() =>
          pendingAction!.kind === "delete" ? deleteUserAction(pendingAction!.user.id) : toggleUserActiveAction(pendingAction!.user.id)
        }
        onDone={(result) => {
          setPendingAction(null);
          if (result.message) notify(result.message);
        }}
      >
        {pendingAction?.kind === "delete" ? (
          <p className="mb-0">
            Se eliminará la cuenta de <strong>{pendingAction.user.name}</strong> ({pendingAction.user.email}) y se cerrarán sus sesiones. Esta acción no se puede deshacer.
          </p>
        ) : pendingAction?.user.active ? (
          <p className="mb-0">
            <strong>{pendingAction.user.name}</strong> no podrá iniciar sesión y se cerrarán sus sesiones abiertas. Puedes volver a activarlo cuando quieras.
          </p>
        ) : (
          <p className="mb-0">
            <strong>{pendingAction?.user.name}</strong> podrá volver a iniciar sesión.
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
