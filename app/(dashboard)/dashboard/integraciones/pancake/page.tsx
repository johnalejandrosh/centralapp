import type { Metadata } from "next";
import { Suspense } from "react";
import { NoAccess } from "@/components/admin/no-access";
import { TableSkeleton } from "@/components/admin/table-skeleton";
import { ConnectionsManager } from "@/components/integrations/connections-manager";
import { OrdersSyncPanel } from "@/components/integrations/orders-sync-panel";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { hasPermission, requireUser } from "@/lib/server/dal";
import { listIntegrations } from "@/lib/server/integration-queries";

export const metadata: Metadata = {
  title: "Pancake POS",
};

export default function PancakeIntegrationPage() {
  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow mb-0">Integraciones</p>
          <h1>Pancake POS</h1>
          <p className="text-body-secondary mb-0">
            Trae las órdenes de tu tienda y crúzalas con la inversión en pauta para conocer tu CPA real.
          </p>
        </div>
      </header>

      <div className="d-flex flex-column gap-4">
        <Suspense fallback={<TableSkeleton rows={2} />}>
          <ConnectionsSection />
        </Suspense>
        <Suspense fallback={<TableSkeleton rows={4} />}>
          <SyncSection />
        </Suspense>
      </div>
    </>
  );
}

async function ConnectionsSection() {
  const user = await requireUser();
  if (!hasPermission(user, PERMISSIONS.INTEGRATIONS_READ)) {
    return <NoAccess permission={PERMISSIONS.INTEGRATIONS_READ} />;
  }

  return (
    <ConnectionsManager
      integrations={await listIntegrations("pancake")}
      provider="pancake"
      title="Tiendas conectadas"
      hint="Pega la API key de Pancake POS: el Shop ID y el nombre de la tienda se completan solos."
    />
  );
}

async function SyncSection() {
  const user = await requireUser();
  if (!hasPermission(user, PERMISSIONS.INTEGRATIONS_SYNC)) {
    return <NoAccess permission={PERMISSIONS.INTEGRATIONS_SYNC} />;
  }

  return <OrdersSyncPanel provider="pancake" integrations={await listIntegrations("pancake")} />;
}
