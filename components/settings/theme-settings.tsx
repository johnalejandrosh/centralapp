"use client";

import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormCheck,
  CFormSwitch,
  CProgress,
  CRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilCheckCircle, cilContrast, cilLoopCircular, cilMoon, cilSun } from "@coreui/icons";
import { useAppTheme } from "@/lib/theme/app-theme";
import { useColorMode, type ColorMode } from "@/lib/theme/color-mode";
import { DEFAULT_APP_THEME } from "@/lib/theme/init-script";
import { APP_THEMES } from "@/lib/theme/themes";
import { ThemePreview } from "./theme-preview";

const MODES: { mode: ColorMode; label: string; hint: string; icon: string[] }[] = [
  { mode: "light", label: "Claro", hint: "Fondos luminosos", icon: cilSun },
  { mode: "dark", label: "Oscuro", hint: "Descansa la vista", icon: cilMoon },
  { mode: "auto", label: "Sistema", hint: "Sigue a tu equipo", icon: cilContrast },
];

export function ThemeSettings() {
  const { theme, setTheme } = useAppTheme();
  const { mode, setMode } = useColorMode();
  const activeTheme = APP_THEMES.find((option) => option.id === theme) ?? APP_THEMES[0];

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow mb-0">Configuración</p>
          <h1>Temas y apariencia</h1>
          <p className="text-body-secondary mb-0">
            Elige cómo se ve CentralApp. Tu preferencia se guarda en este navegador.
          </p>
        </div>
        <CButton
          color="secondary"
          variant="outline"
          className="d-inline-flex align-items-center gap-2"
          onClick={() => {
            setTheme(DEFAULT_APP_THEME);
            setMode("auto");
          }}
        >
          <CIcon icon={cilLoopCircular} />
          Restablecer
        </CButton>
      </header>

      {/* ---------------------------------------------------------- Modo */}
      <section className="settings-section" aria-labelledby="mode-title">
        <div className="settings-section__head">
          <h2 id="mode-title">Modo</h2>
          <p>Claro, oscuro o según la configuración de tu sistema.</p>
        </div>
        <div className="mode-options" role="radiogroup" aria-labelledby="mode-title">
          {MODES.map((option) => (
            <button
              key={option.mode}
              type="button"
              role="radio"
              aria-checked={mode === option.mode}
              className="mode-option"
              onClick={() => setMode(option.mode)}
            >
              <span className="mode-option__icon">
                <CIcon icon={option.icon} size="lg" />
              </span>
              <span>
                <span className="mode-option__label">{option.label}</span>
                <span className="mode-option__hint">{option.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- Temas */}
      <section className="settings-section" aria-labelledby="themes-title">
        <div className="settings-section__head">
          <h2 id="themes-title">Tema de color</h2>
          <p>Cada tema ajusta colores, gráficas y el panel de acceso. Funciona en modo claro y oscuro.</p>
        </div>
        <CRow xs={{ cols: 1, gutter: 3 }} md={{ cols: 2 }} xxl={{ cols: 3 }} role="radiogroup" aria-labelledby="themes-title">
          {APP_THEMES.map((option) => {
            const selected = option.id === theme;
            return (
              <CCol key={option.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className="theme-card"
                  onClick={() => setTheme(option.id)}
                >
                  <ThemePreview theme={option} />
                  <span className="theme-card__body">
                    <span className="theme-card__title">
                      {option.name}
                      {selected && (
                        <span className="theme-card__badge">
                          <CIcon icon={cilCheckCircle} size="sm" /> Activo
                        </span>
                      )}
                    </span>
                    <span className="theme-card__desc">{option.description}</span>
                    <span className="theme-card__swatches" aria-hidden="true">
                      {option.swatches.charts.map((color) => (
                        <span key={color} style={{ background: color }} />
                      ))}
                      {option.sidebar === "dark" && <span className="theme-card__tag">Menú oscuro</span>}
                    </span>
                  </span>
                </button>
              </CCol>
            );
          })}
        </CRow>
      </section>

      {/* ---------------------------------------------------------- Vista previa */}
      <section className="settings-section" aria-labelledby="preview-title">
        <div className="settings-section__head">
          <h2 id="preview-title">Vista previa en vivo</h2>
          <p>Así se ven los componentes con el tema {activeTheme.name}.</p>
        </div>
        <CCard>
          <CCardBody>
            <CRow className="g-4">
              <CCol md={6} className="d-grid gap-3 align-content-start">
                <div className="d-flex flex-wrap gap-2">
                  <CButton color="primary">Acción principal</CButton>
                  <CButton color="primary" variant="outline">
                    Secundaria
                  </CButton>
                  <CButton color="secondary" variant="ghost">
                    Cancelar
                  </CButton>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <CBadge className="bg-primary-subtle text-primary-emphasis">Destacado</CBadge>
                  <CBadge className="bg-success-subtle text-success-emphasis">Pagado</CBadge>
                  <CBadge className="bg-warning-subtle text-warning-emphasis">Pendiente</CBadge>
                  <CBadge className="bg-danger-subtle text-danger-emphasis">Vencido</CBadge>
                </div>
                <p className="mb-0">
                  Texto con un <a href="#preview-title">enlace del tema</a> y una{" "}
                  <span className="highlight">palabra resaltada</span>.
                </p>
              </CCol>
              <CCol md={6} className="d-grid gap-3 align-content-start">
                <div className="d-flex flex-wrap gap-4">
                  <CFormSwitch id="preview-switch" label="Notificaciones" defaultChecked />
                  <CFormCheck id="preview-check" label="Recordar" defaultChecked />
                </div>
                <div>
                  <div className="d-flex justify-content-between small mb-1">
                    <span className="text-body-secondary">Meta mensual</span>
                    <span className="fw-semibold">72%</span>
                  </div>
                  <CProgress value={72} color="primary" aria-label="Meta mensual: 72%" />
                </div>
                <CAlert color="primary" className="mb-0 py-2 small">
                  Los cambios se aplican al instante en toda la aplicación.
                </CAlert>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      </section>
    </>
  );
}
