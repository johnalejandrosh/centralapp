import type { Metadata } from "next";
import { Suspense } from "react";
import { NoAccess } from "@/components/admin/no-access";
import { TableSkeleton } from "@/components/admin/table-skeleton";
import { PermissionsManager } from "@/components/permissions/permissions-manager";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listPermissions } from "@/lib/server/admin-queries";
import { hasPermission, requireUser } from "@/lib/server/dal";

export const metadata: Metadata = {
  title: "Permisos",
};

export default function PermissionsPage() {
  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow mb-0">Usuarios y acceso</p>
          <h1>Permisos</h1>
          <p className="text-body-secondary mb-0">Catálogo de acciones que se pueden otorgar a cada rol.</p>
        </div>
      </header>
      <Suspense fallback={<TableSkeleton rows={8} />}>
        <PermissionsSection />
      </Suspense>
    </>
  );
}

async function PermissionsSection() {
  const user = await requireUser();
  if (!hasPermission(user, PERMISSIONS.PERMISSIONS_READ)) {
    return <NoAccess permission={PERMISSIONS.PERMISSIONS_READ} />;
  }

  return <PermissionsManager permissions={await listPermissions()} />;
}
