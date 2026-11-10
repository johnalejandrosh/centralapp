/** Esqueleto de carga para las tablas de administración (renderizable en servidor). */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="card" aria-busy="true" aria-label="Cargando…">
      <div className="card-body placeholder-glow">
        <div className="d-flex gap-2 mb-4">
          <span className="placeholder rounded-pill col-5" style={{ height: "2.25rem" }} />
          <span className="placeholder rounded-pill col-2" style={{ height: "2.25rem" }} />
          <span className="placeholder rounded-pill col-2 ms-auto" style={{ height: "2.25rem" }} />
        </div>
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="d-flex align-items-center gap-3 py-2 border-bottom">
            <span className="placeholder rounded-circle" style={{ width: "2.25rem", height: "2.25rem" }} />
            <span className="placeholder col-4" />
            <span className="placeholder col-2 ms-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
