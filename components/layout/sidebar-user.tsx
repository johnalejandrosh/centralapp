"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import {
  CAvatar,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilAccountLogout, cilChevronTop, cilSettings, cilUser } from "@coreui/icons";
import { logoutAction } from "@/app/(auth)/actions";
import { useSession } from "@/components/providers/session-provider";
import { initials } from "@/lib/initials";

function LogoutButton() {
  const { pending } = useFormStatus();
  return (
    <CDropdownItem as="button" type="submit" className="text-danger-emphasis" disabled={pending}>
      {pending ? <CSpinner size="sm" className="me-2" aria-hidden /> : <CIcon icon={cilAccountLogout} className="me-2" />}
      Cerrar sesión
    </CDropdownItem>
  );
}

/** Perfil al pie del sidebar con menú hacia arriba (rol, mi perfil, apariencia, cerrar sesión). */
export function SidebarUser() {
  const { user } = useSession();

  return (
    <CDropdown direction="dropup" className="w-100">
      <CDropdownToggle custom caret={false}>
        <button type="button" className="sidebar-user" aria-label="Menú de la cuenta">
          <CAvatar size="md" status="success" className="avatar-brand">
            {initials(user.name)}
          </CAvatar>
          <span className="sidebar-user__meta d-sidebar-narrow-none">
            <span className="sidebar-user__name">{user.name}</span>
            <span className="sidebar-user__email">{user.email}</span>
          </span>
          <CIcon icon={cilChevronTop} className="ms-auto text-body-tertiary d-sidebar-narrow-none" />
        </button>
      </CDropdownToggle>
      <CDropdownMenu className="w-100">
        <CDropdownHeader className="small">
          Rol: <span className="fw-semibold text-body">{user.roleName}</span>
        </CDropdownHeader>
        <CDropdownItem as={Link} href="/dashboard/configuracion/perfil">
          <CIcon icon={cilUser} className="me-2" />
          Mi perfil
        </CDropdownItem>
        <CDropdownItem as={Link} href="/dashboard/configuracion/temas">
          <CIcon icon={cilSettings} className="me-2" />
          Apariencia
        </CDropdownItem>
        <CDropdownDivider />
        {/* Server Action: borra la sesión en la base y la cookie, y redirige al login. */}
        <form action={logoutAction}>
          <LogoutButton />
        </form>
      </CDropdownMenu>
    </CDropdown>
  );
}
