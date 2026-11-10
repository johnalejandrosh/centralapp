"use client";

import { useState, type ReactNode } from "react";
import { CContainer } from "@coreui/react";
import { ToastProvider } from "@/components/providers/toast-provider";
import { AppFooter } from "./app-footer";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";

/**
 * Estructura del área privada: sidebar + header + contenido + footer.
 * La sesión la valida el servidor (layout del dashboard y cada página vía el DAL).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [sidebarUnfoldable, setSidebarUnfoldable] = useState(false);

  return (
    <ToastProvider>
      <AppSidebar
        visible={sidebarVisible}
        unfoldable={sidebarUnfoldable}
        onVisibleChange={setSidebarVisible}
        onToggleUnfoldable={() => setSidebarUnfoldable((value) => !value)}
      />
      <div className="app-wrapper">
        <AppHeader onToggleSidebar={() => setSidebarVisible((value) => !value)} />
        <main className="app-content">
          <CContainer className="px-3 px-lg-4" xxl>
            {children}
          </CContainer>
        </main>
        <AppFooter />
      </div>
    </ToastProvider>
  );
}
