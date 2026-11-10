import Link from "next/link";
import { AuthAside } from "@/components/auth/auth-aside";
import { Logo } from "@/components/brand/logo";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";

/** Pantalla dividida: panel de marca a la izquierda, formulario a la derecha. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <AuthAside />
      <main className="auth-main">
        <div className="auth-topbar">
          <Link href="/login" className="d-inline-flex align-items-center gap-2 text-decoration-none d-lg-none">
            <Logo size={30} />
          </Link>
          <ThemeSwitcher className="ms-auto" />
        </div>
        <div className="auth-form-wrap">{children}</div>
        <p className="small text-body-tertiary text-center mb-0">CentralApp · Entorno de desarrollo, sin backend</p>
      </main>
    </div>
  );
}
