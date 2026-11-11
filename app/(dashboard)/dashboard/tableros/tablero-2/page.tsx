import type { Metadata } from "next";
import { Suspense } from "react";
import { NoAccess } from "@/components/admin/no-access";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { hasPermission, requireUser } from "@/lib/server/dal";

export const metadata: Metadata = {
  title: "Tablero 2",
};

export default function Tablero2Page() {
  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow mb-0">Tableros</p>
          <h1>Tablero 2</h1>
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
  if (!hasPermission(user, PERMISSIONS.TABLERO2_VIEW)) {
    return <NoAccess permission={PERMISSIONS.TABLERO2_VIEW} />;
  }

  return (
    <section className="card" aria-label="Tablero 2">
      <div className="card-body" style={{ minHeight: "16rem" }} />
    </section>
  );
}

function BoardFallback() {
  return (
    <div className="placeholder-glow" aria-busy="true" aria-label="Cargando…">
      <span className="placeholder rounded-3 w-100 d-block" style={{ height: "16rem" }} />
    </div>
  );
}
