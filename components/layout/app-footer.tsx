"use client";

import { CFooter } from "@coreui/react";

export function AppFooter() {
  return (
    <CFooter className="app-footer px-3 px-lg-4">
      <span>CentralApp · v0.1.0</span>
      <span className="ms-auto">
        Interfaz construida con{" "}
        <a href="https://coreui.io/react/" target="_blank" rel="noopener noreferrer">
          CoreUI
        </a>
      </span>
    </CFooter>
  );
}
