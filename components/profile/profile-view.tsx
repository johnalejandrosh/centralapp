"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CAlert, CAvatar, CBadge, CButton, CCard, CCardBody, CCol, CRow } from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilCheckAlt, cilMobile, cilPencil, cilScreenDesktop, cilShieldAlt } from "@coreui/icons";
import { LocalDate } from "@/components/admin/local-date";
import { useSession } from "@/components/providers/session-provider";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { groupByModule } from "@/lib/group-by-module";
import { initials } from "@/lib/initials";
import type { Profile } from "@/lib/server/profile-queries";

function SectionHead({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  return (
    <div className="profile-section-head">
      <div>
        <h2>{title}</h2>
        <p>{hint}</p>
      </div>
      {action}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return <span className={`status-dot ${active ? "is-active" : ""}`}>{active ? "Activa" : "Inactiva"}</span>;
}

/** Perfil de solo lectura del usuario que inició sesión. */
export function ProfileView({ profile }: { profile: Profile }) {
  const { can } = useSession();
  const { role, sessions } = profile;
  const groups = groupByModule(profile.permissions);
  const canEditUsers = can(PERMISSIONS.USERS_UPDATE);

  return (
    <CRow className="g-4">
      {/* ------------------------------------------------------------ Identidad */}
      <CCol xl={4}>
        <CCard className="profile-card">
          <div className="profile-card__cover" aria-hidden="true" />
          <CCardBody className="profile-card__body">
            <CAvatar size="xl" className="avatar-brand profile-card__avatar">
              {initials(profile.name)}
            </CAvatar>
            <h2 className="profile-card__name">{profile.name}</h2>
            <p className="profile-card__email">{profile.email}</p>
            <div className="d-flex flex-wrap align-items-center justify-content-center gap-2">
              <CBadge className="bg-primary-subtle text-primary-emphasis">{role.name}</CBadge>
              <StatusDot active={profile.active} />
            </div>
          </CCardBody>
          <dl className="profile-stats">
            <div>
              <dt>Permisos</dt>
              <dd>{profile.permissions.length}</dd>
            </div>
            <div>
              <dt>Módulos</dt>
              <dd>{groups.length}</dd>
            </div>
            <div>
              <dt>Sesiones</dt>
              <dd>{sessions.length}</dd>
            </div>
          </dl>
        </CCard>
      </CCol>

      <CCol xl={8} className="d-flex flex-column gap-4">
        {/* ---------------------------------------------------------- Cuenta */}
        <CCard>
          <CCardBody>
            <SectionHead
              title="Información de la cuenta"
              hint="Los datos con los que te identificas en CentralApp."
              action={
                canEditUsers && (
                  <CButton
                    as={Link}
                    href={`/dashboard/usuarios?q=${encodeURIComponent(profile.email)}`}
                    color="secondary"
                    variant="outline"
                    size="sm"
                    className="d-inline-flex align-items-center gap-2"
                  >
                    <CIcon icon={cilPencil} size="sm" />
                    Editar en Usuarios
                  </CButton>
                )
              }
            />
            <dl className="profile-fields">
              <Field label="Nombre completo">{profile.name}</Field>
              <Field label="Correo electrónico">{profile.email}</Field>
              <Field label="Rol">{role.name}</Field>
              <Field label="Estado de la cuenta">
                <StatusDot active={profile.active} />
              </Field>
              <Field label="Miembro desde">
                <LocalDate iso={profile.createdAt} withTime={false} />
              </Field>
              <Field label="Último inicio de sesión">
                <LocalDate iso={profile.lastLoginAt} fallback="Sin registro" />
              </Field>
              <Field label="Última actualización">
                <LocalDate iso={profile.updatedAt} />
              </Field>
              <Field label="ID de usuario">
                <code>{profile.id}</code>
              </Field>
            </dl>
            {!canEditUsers && (
              <p className="profile-note">Para cambiar tus datos o tu contraseña, pide ayuda a un administrador.</p>
            )}
          </CCardBody>
        </CCard>

        {/* ---------------------------------------------------------- Rol y permisos */}
        <CCard>
          <CCardBody>
            <SectionHead title="Rol y permisos" hint="Lo que puedes ver y hacer según tu rol." />
            <div className="profile-role">
              <span className={`role-card__icon ${role.isSystem ? "is-system" : ""}`}>
                <CIcon icon={cilShieldAlt} />
              </span>
              <div className="min-w-0">
                <p className="profile-role__name">
                  {role.name}
                  {role.isSystem && <CBadge className="ms-2 bg-primary-subtle text-primary-emphasis">Sistema</CBadge>}
                </p>
                <p className="profile-role__desc">{role.description || "Sin descripción."}</p>
              </div>
            </div>

            {role.isSystem && (
              <CAlert color="primary" className="small py-2">
                Tu rol tiene acceso total: incluye todos los permisos del catálogo y los que se agreguen más adelante.
              </CAlert>
            )}

            {groups.length === 0 ? (
              <p className="text-body-secondary mb-0">Tu rol todavía no tiene permisos asignados.</p>
            ) : (
              <div className="profile-permissions">
                {groups.map((group) => (
                  <section key={group.module} className="profile-permissions__group" aria-label={`Módulo ${group.module}`}>
                    <h3>
                      {group.module}
                      <span className="profile-permissions__count">{group.items.length}</span>
                    </h3>
                    <ul>
                      {group.items.map((permission) => (
                        <li key={permission.key} title={permission.description ?? undefined}>
                          <CIcon icon={cilCheckAlt} size="sm" className="profile-permissions__check" />
                          <span className="min-w-0">
                            <span className="d-block">{permission.name}</span>
                            <code>{permission.key}</code>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </CCardBody>
        </CCard>

        {/* ---------------------------------------------------------- Sesiones */}
        <CCard>
          <CCardBody>
            <SectionHead title="Sesiones activas" hint="Dispositivos desde los que tu cuenta tiene una sesión abierta." />
            {sessions.length === 0 ? (
              <p className="text-body-secondary mb-0">No hay sesiones activas.</p>
            ) : (
              <ul className="session-list">
                {sessions.map((session, index) => (
                  <li key={index} className={`session-item ${session.current ? "is-current" : ""}`}>
                    <span className="session-item__icon">
                      <CIcon icon={session.mobile ? cilMobile : cilScreenDesktop} />
                    </span>
                    <div className="min-w-0 flex-grow-1">
                      <p className="session-item__title">
                        {session.device}
                        {session.current && <CBadge className="ms-2 bg-success-subtle text-success-emphasis">Esta sesión</CBadge>}
                      </p>
                      <p className="session-item__meta">
                        Inició el <LocalDate iso={session.createdAt} /> · vence el <LocalDate iso={session.expiresAt} />
                      </p>
                    </div>
                    <CBadge className="bg-body-tertiary text-body-secondary d-none d-sm-inline-block">
                      {session.persistent ? "Recordada 30 días" : "Sesión de navegador"}
                    </CBadge>
                  </li>
                ))}
              </ul>
            )}
            <p className="profile-note">
              ¿No reconoces una sesión? Pide a un administrador que cambie tu contraseña: eso cierra todas las demás.
            </p>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
}
