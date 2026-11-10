"use client";

import { useState, useTransition, type ReactNode } from "react";
import { CAlert, CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle, CSpinner } from "@coreui/react";
import type { ActionResult } from "@/lib/actions";

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  /** Server Action a ejecutar; si falla, el mensaje se muestra en el diálogo. */
  onConfirm: () => Promise<ActionResult>;
  onDone: (result: ActionResult) => void;
  onClose: () => void;
};

export function ConfirmDialog({ visible, title, children, confirmLabel, tone = "danger", onConfirm, onDone, onClose }: ConfirmDialogProps) {
  return (
    <CModal visible={visible} onClose={onClose} alignment="center" aria-labelledby="confirm-dialog-title">
      {/* El contenido se desmonta al cerrar, así cada apertura empieza sin errores previos. */}
      <ConfirmBody title={title} confirmLabel={confirmLabel} tone={tone} onConfirm={onConfirm} onDone={onDone} onClose={onClose}>
        {children}
      </ConfirmBody>
    </CModal>
  );
}

function ConfirmBody({ title, children, confirmLabel, tone, onConfirm, onDone, onClose }: Omit<ConfirmDialogProps, "visible">) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function confirm() {
    startTransition(async () => {
      const result = await onConfirm();
      if (result.ok) {
        onDone(result);
      } else {
        setError(result.message ?? "No se pudo completar la acción.");
      }
    });
  }

  return (
    <>
      <CModalHeader>
        <CModalTitle id="confirm-dialog-title">{title}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {error && (
          <CAlert color="danger" className="py-2 small">
            {error}
          </CAlert>
        )}
        {children}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="ghost" onClick={onClose} disabled={pending}>
          Cancelar
        </CButton>
        <CButton color={tone} onClick={confirm} disabled={pending}>
          {pending && <CSpinner size="sm" className="me-2" aria-hidden />}
          {confirmLabel}
        </CButton>
      </CModalFooter>
    </>
  );
}
