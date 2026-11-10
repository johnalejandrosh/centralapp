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
  title: "Shopify",
};

export default function ShopifyIntegrationPage() {
  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow mb-0">Integraciones</p>
          <h1>Shopify</h1>
          <p className="text-body-secondary mb-0">
            Trae los pedidos de tu tienda Shopify y crúzalos con la inversión en pauta para conocer tu CPA real.
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
      integrations={await listIntegrations("shopify")}
      provider="shopify"
      title="Tiendas conectadas"
      hint="Cada tienda se conecta con su dominio (propio o .myshopify.com) y el Client ID y Client secret de su app del Dev Dashboard."
    />
  );
}

async function SyncSection() {
  const user = await requireUser();
  if (!hasPermission(user, PERMISSIONS.INTEGRATIONS_SYNC)) {
    return <NoAccess permission={PERMISSIONS.INTEGRATIONS_SYNC} />;
  }

  return <OrdersSyncPanel provider="shopify" integrations={await listIntegrations("shopify")} />;
}
