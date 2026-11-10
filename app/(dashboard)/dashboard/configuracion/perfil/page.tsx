import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileSkeleton } from "@/components/profile/profile-skeleton";
import { ProfileView } from "@/components/profile/profile-view";
import { requireUser } from "@/lib/server/dal";
import { getProfile } from "@/lib/server/profile-queries";

export const metadata: Metadata = {
  title: "Mi perfil",
};

export default function ProfilePage() {
  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow mb-0">Configuración</p>
          <h1>Mi perfil</h1>
          <p className="text-body-secondary mb-0">Tu cuenta, tu rol, tus permisos y tus sesiones activas.</p>
        </div>
      </header>
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileSection />
      </Suspense>
    </>
  );
}

/** Cualquier usuario con sesión puede ver su propio perfil: no requiere permiso. */
async function ProfileSection() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  return <ProfileView profile={profile} />;
}
