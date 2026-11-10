/** Aviso cuando el usuario no tiene el permiso de lectura de una sección (renderizable en servidor). */
export function NoAccess({ permission }: { permission: string }) {
  return (
    <div className="card">
      <div className="card-body text-center py-5">
        <div className="no-access__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>
        <h2 className="h5 mt-3 mb-1">No tienes acceso a esta sección</h2>
        <p className="text-body-secondary mb-0">
          Pide a un administrador el permiso <code>{permission}</code>.
        </p>
      </div>
    </div>
  );
}
