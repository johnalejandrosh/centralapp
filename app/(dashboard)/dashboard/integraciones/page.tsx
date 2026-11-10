import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NoAccess } from "@/components/admin/no-access";
import { TableSkeleton } from "@/components/admin/table-skeleton";
import { ConnectionsManager } from "@/components/integrations/connections-manager";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PROVIDER_LIST } from "@/lib/integrations/catalog";
import { hasPermission, requireUser } from "@/lib/server/dal";
import { listIntegrations } from "@/lib/server/integration-queries";

export const metadata: Metadata = {
  title: "Integraciones",
};

export default function IntegrationsPage() {
  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow mb-0">Integraciones</p>
          <h1>Conexiones</h1>
          <p className="text-body-secondary mb-0">Conecta CentralApp con los servicios donde vive tu operación y trae sus datos.</p>
        </div>
      </header>

      <section aria-labelledby="catalog-title" className="mb-4">
        <h2 id="catalog-title" className="visually-hidden">
          Servicios disponibles
        </h2>
        <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
          {PROVIDER_LIST.map((provider) => (
            <div key={provider.id} className="col">
              <article className="card integration-card h-100">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex align-items-start gap-3">
                    <span className="integration-card__logo" aria-hidden="true">
                      {provider.monogram}
                    </span>
                    <div className="min-w-0">
                      <h3 className="integration-card__title">{provider.name}</h3>
                      <p className="integration-card__desc">{provider.tagline}</p>
                    </div>
                  </div>
                  <ul className="integration-card__syncs">
                    {provider.syncs.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <div className="integration-card__actions">
                    <Link href={provider.href} className="btn btn-primary btn-sm">
                      Abrir
                    </Link>
                  </div>
                </div>
              </article>
            </div>
          ))}
        </div>
      </section>

      <Suspense fallback={<TableSkeleton rows={3} />}>
        <ConnectionsSection />
      </Suspense>
    </>
  );
}

async function ConnectionsSection() {
  const user = await requireUser();
  if (!hasPermission(user, PERMISSIONS.INTEGRATIONS_READ)) {
    return <NoAccess permission={PERMISSIONS.INTEGRATIONS_READ} />;
  }

  return <ConnectionsManager integrations={await listIntegrations()} />;
}
