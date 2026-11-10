/** Esqueleto de carga del perfil (renderizable en servidor). */
export function ProfileSkeleton() {
  return (
    <div className="row g-4 placeholder-glow" aria-busy="true" aria-label="Cargando perfil…">
      <div className="col-xl-4">
        <div className="card">
          <div className="card-body text-center py-5">
            <span className="placeholder rounded-circle" style={{ width: "4.5rem", height: "4.5rem" }} />
            <div className="mt-3">
              <span className="placeholder col-6" />
            </div>
            <span className="placeholder col-8" />
          </div>
        </div>
      </div>
      <div className="col-xl-8">
        <div className="card">
          <div className="card-body">
            <span className="placeholder col-4 mb-4" style={{ height: "1.25rem" }} />
            <div className="row g-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="col-sm-6 col-lg-4">
                  <span className="placeholder col-5 d-block mb-2" />
                  <span className="placeholder col-9" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
