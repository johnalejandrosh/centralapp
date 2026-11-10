"use client";

import { createContext, use, useCallback, useState, type ReactElement, type ReactNode } from "react";
import { CToast, CToastBody, CToastClose, CToaster } from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilCheckCircle, cilWarning } from "@coreui/icons";

type Tone = "success" | "danger";

const ToastContext = createContext<((message: string, tone?: Tone) => void) | null>(null);

/** Notificaciones con CToaster (patrón `push` de la documentación de CoreUI). */
export function ToastProvider({ children }: { children: ReactNode }) {
  // `push` de CToaster espera un elemento CToast.
  const [toast, setToast] = useState<ReactElement<React.ComponentProps<typeof CToast>>>();

  const notify = useCallback((message: string, tone: Tone = "success") => {
    setToast(
      <CToast autohide delay={4500} className="app-toast" role={tone === "danger" ? "alert" : "status"}>
        <CToastBody className="d-flex align-items-center gap-2">
          <CIcon
            icon={tone === "success" ? cilCheckCircle : cilWarning}
            className={tone === "success" ? "text-success" : "text-danger"}
          />
          <span>{message}</span>
          <CToastClose className="ms-auto" aria-label="Cerrar notificación" />
        </CToastBody>
      </CToast>,
    );
  }, []);

  return (
    <ToastContext value={notify}>
      {children}
      <CToaster className="p-3" placement="top-end" push={toast} />
    </ToastContext>
  );
}

export function useToast() {
  const notify = use(ToastContext);
  if (!notify) {
    throw new Error("useToast debe usarse dentro de <ToastProvider>.");
  }
  return notify;
}
