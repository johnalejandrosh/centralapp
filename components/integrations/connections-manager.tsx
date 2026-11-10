"use client";

import { useState, useTransition } from "react";
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CModal,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilPencil, cilPlus, cilSync, cilTrash } from "@coreui/icons";
import { deleteIntegrationAction, testIntegrationAction } from "@/app/(dashboard)/dashboard/integraciones/actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { LocalDate } from "@/components/admin/local-date";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { isProviderId, PROVIDERS, type ProviderId } from "@/lib/integrations/catalog";
import type { IntegrationRow } from "@/lib/server/integration-queries";
import { IntegrationForm } from "./integration-form";

const STATUS: Record<IntegrationRow["status"], { label: string; className: string }> = {
  CONNECTED: { label: "Conectada", className: "bg-success-subtle text-success-emphasis" },
  PENDING: { label: "Sin probar", className: "bg-warning-subtle text-warning-emphasis" },
  ERROR: { label: "Con error", className: "bg-danger-subtle text-danger-emphasis" },
};

type ConnectionsManagerProps = {
  integrations: IntegrationRow[];
  /** Si se indica, la tabla es de un solo proveedor y las conexiones nuevas son de ese proveedor. */
  provider?: ProviderId;
  title?: string;
  hint?: string;
};

export function ConnectionsManager({ integrations, provider, title = "Conexiones", hint }: ConnectionsManagerProps) {
  const { can } = useSession();
  const notify = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IntegrationRow | null>(null);
  const [deleting, setDeleting] = useState<IntegrationRow | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testing, startTesting] = useTransition();

  const canCreate = can(PERMISSIONS.INTEGRATIONS_CREATE);
  const canUpdate = can(PERMISSIONS.INTEGRATIONS_UPDATE);
  const canDelete = can(PERMISSIONS.INTEGRATIONS_DELETE);
  const canSync = can(PERMISSIONS.INTEGRATIONS_SYNC);
  const hasActions = canUpdate || canDelete || canSync;
  const newLabel = provider ? `Conectar ${PROVIDERS[provider].name}` : "Nueva conexión";

  function openForm(integration: IntegrationRow | null) {
    setEditing(integration);
    setFormOpen(true);
  }

  function test(integration: IntegrationRow) {
    setTestingId(integration.id);
    startTesting(async () => {
      const result = await testIntegrationAction(integration.id);
      notify(result.message ?? (result.ok ? "Conexión verificada." : "La prueba falló."), result.ok ? "success" : "danger");
      setTestingId(null);
    });
  }

  return (
    <CCard>
      <CCardBody>
        <div className="profile-section-head">
          <div>
            <h2>{title}</h2>
            <p>{hint ?? "Cuentas de servicios externos conectadas a CentralApp."}</p>
          </div>
          {canCreate && (
            <CButton color="primary" size="sm" className="d-inline-flex align-items-center gap-2" onClick={() => openForm(null)}>
              <CIcon icon={cilPlus} size="sm" />
              {newLabel}
            </CButton>
          )}
        </div>

        {integrations.length === 0 ? (
          <div className="integration-empty">
            <p className="fw-semibold text-body-emphasis mb-1">Todavía no hay conexiones.</p>
            <p className="small text-body-secondary mb-0">
              {canCreate
                ? `Pulsa «${newLabel}» y pega tu API key para conectar tu primera cuenta.`
                : "Pide a un administrador que conecte la cuenta (permiso integrations.create)."}
            </p>
          </div>
        ) : (
          <CTable className="table-admin" align="middle" hover responsive>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell scope="col">Conexión</CTableHeaderCell>
                <CTableHeaderCell scope="col">Cuenta</CTableHeaderCell>
                <CTableHeaderCell scope="col">Clave</CTableHeaderCell>
                <CTableHeaderCell scope="col">Estado</CTableHeaderCell>
                <CTableHeaderCell scope="col">Última sincronización</CTableHeaderCell>
                {hasActions && (
                  <CTableHeaderCell scope="col" className="text-end">
                    <span className="visually-hidden">Acciones</span>
                  </CTableHeaderCell>
                )}
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {integrations.map((integration) => {
                const providerInfo = isProviderId(integration.provider) ? PROVIDERS[integration.provider] : null;
                const status = STATUS[integration.status];
                const isTesting = testing && testingId === integration.id;
                return (
                  <CTableRow key={integration.id}>
                    <CTableDataCell>
                      <div className="fw-semibold text-body-emphasis">
                        {integration.name}
                        {!integration.active && <CBadge className="ms-2 bg-secondary-subtle text-secondary-emphasis">Inactiva</CBadge>}
                      </div>
                      <div className="small text-body-secondary">
                        {!provider && <>{providerInfo?.name ?? integration.provider} · </>}
                        {integration.createdByName ? `Conectada por ${integration.createdByName}` : "Conectada"}
                      </div>
                    </CTableDataCell>
                    <CTableDataCell>
                      <span className="small text-body-secondary d-block">{providerInfo?.externalId.label ?? "ID"}</span>
                      <code>{integration.externalId ?? "—"}</code>
                    </CTableDataCell>
                    <CTableDataCell>
                      <code className="text-body-secondary">{integration.apiKeyHint ?? "Sin clave"}</code>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge className={status.className}>{status.label}</CBadge>
                      {integration.status === "ERROR" && integration.lastError && (
                        <div className="small text-danger-emphasis integration-error" title={integration.lastError}>
                          {integration.lastError}
                        </div>
                      )}
                    </CTableDataCell>
                    <CTableDataCell className="text-body-secondary small">
                      <LocalDate iso={integration.lastSyncAt} fallback="Nunca" />
                    </CTableDataCell>
                    {hasActions && (
                      <CTableDataCell className="text-end text-nowrap">
                        {canSync && (
                          <CButton
                            size="sm"
                            variant="ghost"
                            color="secondary"
                            title="Probar conexión"
                            aria-label={`Probar la conexión ${integration.name}`}
                            disabled={testing || !integration.active}
                            onClick={() => test(integration)}
                          >
                            {isTesting ? <CSpinner size="sm" aria-hidden /> : <CIcon icon={cilSync} />}
                          </CButton>
                        )}
                        {canUpdate && (
                          <CButton
                            size="sm"
                            variant="ghost"
                            color="secondary"
                            title="Editar"
                            aria-label={`Editar la conexión ${integration.name}`}
                            onClick={() => openForm(integration)}
                          >
                            <CIcon icon={cilPencil} />
                          </CButton>
                        )}
                        {canDelete && (
                          <CButton
                            size="sm"
                            variant="ghost"
                            color="danger"
                            title="Eliminar"
                            aria-label={`Eliminar la conexión ${integration.name}`}
                            onClick={() => setDeleting(integration)}
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
        )}
      </CCardBody>

      <CModal visible={formOpen} onClose={() => setFormOpen(false)} alignment="center" aria-labelledby="integration-form-title">
        <IntegrationForm
          key={editing?.id ?? "new"}
          integration={editing}
          provider={provider}
          onCancel={() => setFormOpen(false)}
          onSaved={(result) => {
            setFormOpen(false);
            notify(result.message ?? "Cambios guardados.", result.warning ? "danger" : "success");
          }}
        />
      </CModal>

      <ConfirmDialog
        visible={deleting !== null}
        title="Eliminar conexión"
        confirmLabel="Eliminar"
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteIntegrationAction(deleting!.id)}
        onDone={(result) => {
          setDeleting(null);
          if (result.message) notify(result.message);
        }}
      >
        <p className="mb-0">
          Se eliminará la conexión <strong>{deleting?.name}</strong> junto con su clave. CentralApp dejará de consultar esa cuenta;
          en el proveedor no se borra nada.
        </p>
      </ConfirmDialog>
    </CCard>
  );
}
