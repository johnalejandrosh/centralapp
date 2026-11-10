"use client";

import CIcon from "@coreui/icons-react";
import { cilContrast, cilMoon, cilSun } from "@coreui/icons";
import { useColorMode, type ColorMode } from "@/lib/theme/color-mode";

const OPTIONS: { mode: ColorMode; label: string; icon: string[] }[] = [
  { mode: "light", label: "Tema claro", icon: cilSun },
  { mode: "dark", label: "Tema oscuro", icon: cilMoon },
  { mode: "auto", label: "Tema del sistema", icon: cilContrast },
];

/** Control segmentado de tema: claro / oscuro / sistema. */
export function ThemeSwitcher({ className = "" }: { className?: string }) {
  const { mode, setMode } = useColorMode();

  return (
    <div className={`theme-segmented ${className}`} role="group" aria-label="Tema de color">
      {OPTIONS.map((option) => (
        <button
          key={option.mode}
          type="button"
          title={option.label}
          aria-label={option.label}
          aria-pressed={mode === option.mode}
          onClick={() => setMode(option.mode)}
        >
          <CIcon icon={option.icon} />
        </button>
      ))}
    </div>
  );
}
