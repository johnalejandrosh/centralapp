import type { Metadata } from "next";
import { Suspense } from "react";
import { NoAccess } from "@/components/admin/no-access";
import { TableSkeleton } from "@/components/admin/table-skeleton";
import { RolesManager } from "@/components/roles/roles-manager";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listPermissions, listRoles } from "@/lib/server/admin-queries";
import { hasPermission, requireUser } from "@/lib/server/dal";

export const metadata: Metadata = {
  title: "Roles",
};

export default function RolesPage() {
  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow mb-0">Usuarios y acceso</p>
          <h1>Roles</h1>
          <p className="text-body-secondary mb-0">Agrupa permisos en roles y asígnalos a los usuarios.</p>
        </div>
      </header>
      <Suspense fallback={<TableSkeleton rows={4} />}>
        <RolesSection />
      </Suspense>
    </>
  );
}

async function RolesSection() {
  const user = await requireUser();
  if (!hasPermission(user, PERMISSIONS.ROLES_READ)) {
    return <NoAccess permission={PERMISSIONS.ROLES_READ} />;
  }

  const [roles, permissions] = await Promise.all([listRoles(), listPermissions()]);
  return <RolesManager roles={roles} permissions={permissions} />;
}
