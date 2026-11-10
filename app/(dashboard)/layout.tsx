import "@coreui/chartjs/dist/css/coreui-chartjs.css";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SessionProvider, type ClientUser } from "@/components/providers/session-provider";
import { requireUser } from "@/lib/server/dal";

/**
 * Con Cache Components, leer la sesión (cookies) debe ocurrir dentro de <Suspense>.
 * El layout solo provee el usuario a la interfaz; cada página vuelve a verificar
 * permisos en el servidor (los layouts no protegen las páginas por sí solos).
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}

async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const clientUser: ClientUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    roleName: user.roleName,
    isSuperAdmin: user.isSuperAdmin,
    permissions: user.permissions,
  };

  return (
    <SessionProvider user={clientUser}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}

function ShellFallback() {
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: "var(--app-canvas)" }}>
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Cargando…</span>
      </div>
    </div>
  );
}
