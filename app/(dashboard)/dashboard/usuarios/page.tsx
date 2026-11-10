import type { Metadata } from "next";
import { Suspense } from "react";
import { NoAccess } from "@/components/admin/no-access";
import { TableSkeleton } from "@/components/admin/table-skeleton";
import { UsersManager } from "@/components/users/users-manager";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { USERS_PAGE_SIZE, listRoleOptions, listUsers, parseUserFilters } from "@/lib/server/admin-queries";
import { hasPermission, requireUser } from "@/lib/server/dal";

export const metadata: Metadata = {
  title: "Usuarios",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow mb-0">Usuarios y acceso</p>
          <h1>Usuarios</h1>
          <p className="text-body-secondary mb-0">Administra las cuentas, su rol y si pueden iniciar sesión.</p>
        </div>
      </header>
      {/* Sesión y searchParams se leen por request: van dentro de Suspense (Cache Components). */}
      <Suspense fallback={<TableSkeleton />}>
        <UsersSection searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function UsersSection({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  if (!hasPermission(user, PERMISSIONS.USERS_READ)) {
    return <NoAccess permission={PERMISSIONS.USERS_READ} />;
  }

  const filters = parseUserFilters(await searchParams);
  const [{ users, total, pageCount }, roles] = await Promise.all([listUsers(filters), listRoleOptions()]);

  return <UsersManager users={users} total={total} pageCount={pageCount} pageSize={USERS_PAGE_SIZE} filters={filters} roles={roles} />;
}
