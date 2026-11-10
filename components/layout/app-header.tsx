"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { CContainer, CFormInput, CHeader, CHeaderToggler } from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilBell, cilMenu, cilSearch } from "@coreui/icons";
import { Logo } from "@/components/brand/logo";
import { ThemeSwitcher } from "./theme-switcher";

export function AppHeader({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const headerRef = useRef<HTMLDivElement>(null);

  // Sombra suave cuando el contenido pasa por debajo del header.
  useEffect(() => {
    const onScroll = () => {
      headerRef.current?.classList.toggle("shadow-sm", document.documentElement.scrollTop > 0);
    };
    document.addEventListener("scroll", onScroll, { passive: true });
    return () => document.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <CHeader position="sticky" className="app-header p-0" ref={headerRef}>
      <CContainer className="px-3 px-lg-4 gap-2 gap-md-3 flex-nowrap" fluid>
        <CHeaderToggler onClick={onToggleSidebar} className="px-2" aria-label="Mostrar u ocultar menú">
          <CIcon icon={cilMenu} size="lg" />
        </CHeaderToggler>

        <Link href="/dashboard" className="d-lg-none me-auto" aria-label="CentralApp, ir al resumen">
          <Logo size={30} withWordmark={false} />
        </Link>

        {/* Búsqueda visual: se conectará cuando exista el backend. */}
        <form className="header-search d-none d-md-block me-auto" role="search" onSubmit={(event) => event.preventDefault()}>
          <CIcon icon={cilSearch} />
          <CFormInput type="search" placeholder="Buscar pedidos, clientes…" aria-label="Buscar" />
        </form>

        <button type="button" className="icon-btn" aria-label="Notificaciones" title="Notificaciones (próximamente)">
          <CIcon icon={cilBell} />
          <span className="icon-btn__dot" aria-hidden="true" />
        </button>
        <ThemeSwitcher />
      </CContainer>
    </CHeader>
  );
}
