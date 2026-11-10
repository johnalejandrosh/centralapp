"use client";

import CIcon from "@coreui/icons-react";
import { cilBolt, cilChartLine, cilShieldAlt } from "@coreui/icons";
import { Logo } from "@/components/brand/logo";

const FEATURES = [
  { icon: cilChartLine, text: "Ventas, clientes y operación en un solo panel" },
  { icon: cilBolt, text: "Indicadores al día para decidir más rápido" },
  { icon: cilShieldAlt, text: "Accesos por rol para todo tu equipo" },
];

/** Panel de marca de las pantallas de acceso (solo escritorio). */
export function AuthAside() {
  return (
    <aside className="auth-aside">
      <div className="d-flex align-items-center gap-2">
        <Logo size={36} inverted />
      </div>

      <div>
        <h2 className="auth-aside__title">Todo tu negocio, en un solo lugar.</h2>
        <p className="auth-aside__lead mb-0">
          CentralApp reúne la información que hoy está repartida en hojas de cálculo, chats y correos.
        </p>
        <ul className="auth-features">
          {FEATURES.map((feature) => (
            <li key={feature.text}>
              <span className="auth-features__icon">
                <CIcon icon={feature.icon} />
              </span>
              {feature.text}
            </li>
          ))}
        </ul>
      </div>

      {/* Vista previa ilustrativa del dashboard (decorativa). */}
      <div className="auth-preview" aria-hidden="true">
        <div className="auth-preview__label">Ingresos del mes</div>
        <div className="auth-preview__value">$76.950</div>
        <div className="auth-preview__bars">
          {[38, 52, 44, 63, 58, 72, 90].map((height, index) => (
            <span key={index} style={{ height: `${height}%` }} />
          ))}
        </div>
      </div>
    </aside>
  );
}
