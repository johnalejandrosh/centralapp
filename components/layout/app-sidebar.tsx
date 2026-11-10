"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CBadge,
  CButton,
  CCloseButton,
  CNavGroup,
  CNavItem,
  CNavLink,
  CNavTitle,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarNav,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilSidebarClose, cilSidebarOpen } from "@coreui/icons";
import { Logo } from "@/components/brand/logo";
import { useSession } from "@/components/providers/session-provider";
import { navigation, type NavLinkEntry } from "./navigation";
import { SidebarUser } from "./sidebar-user";

type AppSidebarProps = {
  visible: boolean;
  unfoldable: boolean;
  onVisibleChange: (visible: boolean) => void;
  onToggleUnfoldable: () => void;
};

function SidebarLink({ item, pathname }: { item: NavLinkEntry; pathname: string }) {
  const content = (
    <>
      {item.icon ? (
        <CIcon icon={item.icon} customClassName="nav-icon" />
      ) : (
        // Viñeta para los ítems de submenú (patrón de la doc de CoreUI).
        <span className="nav-icon">
          <span className="nav-icon-bullet" />
        </span>
      )}
      {item.label}
      {item.badge && (
        <CBadge color={item.badge.color} className="ms-auto bg-opacity-25 text-body-secondary" size="sm">
          {item.badge.text}
        </CBadge>
      )}
    </>
  );

  return (
    <CNavItem>
      {item.disabled ? (
        <CNavLink disabled>{content}</CNavLink>
      ) : (
        <CNavLink as={Link} href={item.href} active={pathname === item.href}>
          {content}
        </CNavLink>
      )}
    </CNavItem>
  );
}

export function AppSidebar({ visible, unfoldable, onVisibleChange, onToggleUnfoldable }: AppSidebarProps) {
  const pathname = usePathname();
  const { can } = useSession();
  // Solo oculta lo que no corresponde: cada página vuelve a verificar el permiso en el servidor.
  const allowed = (item: NavLinkEntry) => !item.permission || can(item.permission);

  // Filtra por permiso y quita los títulos de sección que quedan vacíos.
  const entries = navigation
    .map((item) => (item.kind === "group" ? { ...item, items: item.items.filter(allowed) } : item))
    .filter((item) => (item.kind === "group" ? item.items.length > 0 : item.kind === "title" || allowed(item)))
    .filter((item, index, list) => item.kind !== "title" || (list[index + 1] && list[index + 1].kind !== "title"));

  return (
    <CSidebar
      as="nav"
      aria-label="Menú principal"
      className="app-sidebar"
      position="fixed"
      unfoldable={unfoldable}
      visible={visible}
      onVisibleChange={onVisibleChange}
    >
      <CSidebarHeader>
        <CSidebarBrand as={Link} href="/dashboard" aria-label="CentralApp, ir al resumen">
          <Logo size={32} wordmarkClassName="d-sidebar-narrow-none" />
        </CSidebarBrand>
        {/* Patrón de la doc: iconos que cambian según el estado narrow-unfoldable. */}
        <CButton
          size="sm"
          variant="ghost"
          className="sidebar-collapse-btn d-none d-lg-flex d-sidebar-narrow-none"
          onClick={onToggleUnfoldable}
          aria-label={unfoldable ? "Fijar menú expandido" : "Contraer menú"}
          aria-pressed={unfoldable}
        >
          <CIcon className="icon icon-lg d-sidebar-narrow-unfoldable" icon={cilSidebarOpen} />
          <CIcon className="icon icon-lg d-sidebar-narrow-unfoldable-none" icon={cilSidebarClose} />
        </CButton>
        <CCloseButton className="d-lg-none ms-auto" aria-label="Cerrar menú" onClick={() => onVisibleChange(false)} />
      </CSidebarHeader>

      <CSidebarNav>
        {entries.map((item) => {
          if (item.kind === "title") {
            return <CNavTitle key={item.label}>{item.label}</CNavTitle>;
          }

          if (item.kind === "group") {
            return (
              <CNavGroup
                key={item.label}
                visible={item.items.some((child) => pathname.startsWith(child.href))}
                toggler={
                  <>
                    <CIcon icon={item.icon} customClassName="nav-icon" />
                    {item.label}
                  </>
                }
              >
                {item.items.map((child) => (
                  <SidebarLink key={child.href} item={child} pathname={pathname} />
                ))}
              </CNavGroup>
            );
          }

          return <SidebarLink key={item.href} item={item} pathname={pathname} />;
        })}
      </CSidebarNav>

      <CSidebarFooter>
        <SidebarUser />
      </CSidebarFooter>
    </CSidebar>
  );
}
