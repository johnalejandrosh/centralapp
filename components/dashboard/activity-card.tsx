"use client";

import { CCard, CCardBody } from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilCart, cilTruck, cilUserPlus, cilWarning } from "@coreui/icons";
import { activity, type ActivityKind } from "@/lib/mock/dashboard";

const KIND_STYLE: Record<ActivityKind, { icon: string[]; tone: string }> = {
  order: { icon: cilCart, tone: "primary" },
  customer: { icon: cilUserPlus, tone: "info" },
  shipping: { icon: cilTruck, tone: "warning" },
  alert: { icon: cilWarning, tone: "danger" },
};

export function ActivityCard() {
  return (
    <CCard className="h-100">
      <CCardBody>
        <div className="card-title-row">
          <div>
            <h2>Actividad</h2>
            <div className="small text-body-secondary">Lo que pasó en tu cuenta</div>
          </div>
        </div>

        <ol className="timeline">
          {activity.map((item) => {
            const style = KIND_STYLE[item.kind];
            return (
              <li key={item.id}>
                <span className={`timeline__icon bg-${style.tone}-subtle text-${style.tone}-emphasis`}>
                  <CIcon icon={style.icon} size="sm" />
                </span>
                <div>
                  <div>{item.text}</div>
                  <div className="timeline__time">{item.time}</div>
                </div>
              </li>
            );
          })}
        </ol>
      </CCardBody>
    </CCard>
  );
}
