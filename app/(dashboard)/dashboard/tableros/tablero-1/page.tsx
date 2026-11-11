import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NoAccess } from "@/components/admin/no-access";
import { ShopifyBoard } from "@/components/analytics/shopify-board";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { hasPermission, requireUser } from "@/lib/server/dal";
import { listIntegrations } from "@/lib/server/integration-queries";

export const metadata: Metadata = {
  title: "Tablero 1 · Analítica de Shopify",
};

export default function Tablero1Page() {
  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow mb-0">Tableros · Tablero 1</p>
          <h1>Analítica de Shopify</h1>
          <p className="text-body-secondary mb-0">
            Ventas, pedidos y productos de tu tienda. Toca un producto o un estado para filtrar todo el tablero.
          </p>
        </div>
      </header>
      <Suspense fallback={<BoardFallback />}>
        <BoardSection />
      </Suspense>
    </>
  );
}

async function BoardSection() {
  const user = await requireUser();
  if (!hasPermission(user, PERMISSIONS.TABLERO1_VIEW)) {
    return <NoAccess permission={PERMISSIONS.TABLERO1_VIEW} />;
  }

  const stores = (await listIntegrations("shopify")).filter((integration) => integration.active && integration.externalId && integration.apiKeyHint);
  if (stores.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-5">
          <h2 className="h5 mb-2">Conecta tu tienda Shopify para ver este tablero</h2>
          <p className="text-body-secondary mb-4">
            El tablero se arma con los pedidos de tu tienda. Conéctala con su dominio, Client ID y Client secret.
          </p>
          <Link href="/dashboard/integraciones/shopify" className="btn btn-primary">
            Conectar Shopify
          </Link>
        </div>
      </div>
    );
  }

  return <ShopifyBoard integrations={stores.map(({ id, name, externalId }) => ({ id, name, externalId }))} />;
}

function BoardFallback() {
  return (
    <div className="placeholder-glow" aria-busy="true" aria-label="Cargando…">
      <span className="placeholder rounded-3 w-100 d-block mb-4" style={{ height: "2.5rem" }} />
      <span className="placeholder rounded-3 w-100 d-block" style={{ height: "20rem" }} />
    </div>
  );
}
