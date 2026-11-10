/**
 * Documentación de la integración con Pancake POS. Contenido estático (renderizable en
 * servidor, sin componentes de CoreUI React) para que forme parte del shell prerenderizado.
 */

const PANCAKE_API = "https://pos.pages.fm/api/v1";

function SectionHead({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="profile-section-head">
      <div>
        <h2>{title}</h2>
        <p>{hint}</p>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- ¿Qué es?

export function PancakeAbout() {
  return (
    <div className="card h-100">
      <div className="card-body">
        <SectionHead title="¿Qué es Pancake POS?" hint="El sistema de ventas de tu tienda." />
        <p className="small">
          <strong>Pancake POS</strong> es un sistema de gestión de ventas e inventario pensado para tiendas que venden por
          redes sociales (Facebook, Instagram, TikTok, WhatsApp) y tiendas online. Ahí quedan registrados los pedidos, los
          productos y su stock, los clientes y los envíos con las transportadoras.
        </p>
        <p className="small">
          Tiene una API REST (<code>{PANCAKE_API}</code>) que se autentica con una <code>api_key</code> por tienda. CentralApp
          la usa para leer tus órdenes reales y compararlas con lo que inviertes en pauta.
        </p>

        <ol className="integration-flow" aria-label="Recorrido de una consulta">
          <li>
            <strong>Tu navegador</strong>
            <span>Pide las órdenes a CentralApp, sin credenciales.</span>
          </li>
          <li>
            <strong>Servidor de CentralApp</strong>
            <span>
              Lee la <code>api_key</code> de la tabla <code>integrations</code> y consulta a Pancake.
            </span>
          </li>
          <li>
            <strong>Pancake POS</strong>
            <span>Responde con las órdenes; el servidor las normaliza y calcula el CPA.</span>
          </li>
        </ol>
        <p className="small text-body-secondary mb-0">
          La clave nunca viaja al navegador: por eso la consulta se hace siempre desde el servidor.
        </p>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- Paso a paso

const STEPS: { title: string; body: React.ReactNode }[] = [
  {
    title: "Crea una API key en Pancake POS",
    body: (
      <>
        En el panel de Pancake POS entra a <strong>Configuración → Configuración de la aplicación → API KEY</strong> y pulsa{" "}
        <strong>Agregar</strong>. Copia la clave en cuanto aparezca: es posible que no se vuelva a mostrar completa.
      </>
    ),
  },
  {
    title: "Pégala en CentralApp: la tienda se encuentra sola",
    body: (
      <>
        Más abajo, en <strong>Tiendas conectadas</strong>, pulsa <strong>Conectar Pancake POS</strong> y pega la API key.
        CentralApp consulta a Pancake qué tiendas tiene esa clave y completa el <strong>Shop ID</strong> y el nombre. Si la
        clave da acceso a varias tiendas, eliges cuál conectar (cada una se conecta por separado).
      </>
    ),
  },
  {
    title: "Guarda y verifica",
    body: (
      <>
        Al pulsar <strong>Conectar</strong>, CentralApp hace una consulta de prueba y marca la conexión como{" "}
        <em>Conectada</em>, o te muestra el error que devolvió Pancake. Puedes repetir la prueba cuando quieras con el botón de
        sincronizar de la tabla.
      </>
    ),
  },
  {
    title: "Consulta órdenes y mide el CPA",
    body: (
      <>
        En <strong>Probar sincronización</strong> elige el período, escribe lo que invertiste en pauta y, si quieres, un
        producto. Verás las órdenes atribuidas, los ingresos, el <strong>CPA real</strong> y el ROAS.
      </>
    ),
  },
];

export function PancakeSteps() {
  return (
    <div className="card h-100">
      <div className="card-body">
        <SectionHead title="Cómo conectarla" hint="Cuatro pasos, unos cinco minutos." />
        <ol className="guide-steps">
          {STEPS.map((step) => (
            <li key={step.title}>
              <p className="guide-steps__title">{step.title}</p>
              <p className="guide-steps__body">{step.body}</p>
            </li>
          ))}
        </ol>
        <p className="profile-note">
          El Shop ID y la API key quedan guardados en la base de datos (tabla <code>integrations</code>), no en archivos de
          configuración: cada tienda se conecta, edita o elimina desde esta pantalla sin tocar el servidor.
        </p>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- Datos sincronizables

const SYNCABLE: { data: string; detail: string; endpoint: string; ready: boolean }[] = [
  {
    data: "Órdenes",
    detail: "Monto, productos y cantidades, fecha, estado, cliente y origen (anuncio, UTM).",
    endpoint: "/shops/{shop_id}/orders",
    ready: true,
  },
  {
    data: "Productos y variantes",
    detail: "Nombre, SKU, precio de venta y stock por bodega.",
    endpoint: "/shops/{shop_id}/products/variations",
    ready: false,
  },
  {
    data: "Clientes",
    detail: "Datos de contacto e historial de compras, para recompra y valor del cliente.",
    endpoint: "/shops/{shop_id}/customers",
    ready: false,
  },
  {
    data: "Inventario",
    detail: "Bodegas, existencias y movimientos de stock.",
    endpoint: "/shops/{shop_id}/inventory-report",
    ready: false,
  },
  {
    data: "Devoluciones",
    detail: "Órdenes devueltas total o parcialmente, para la tasa de devolución.",
    endpoint: "/shops/{shop_id}/order-returns",
    ready: false,
  },
];

export function PancakeSyncableData() {
  return (
    <div className="card">
      <div className="card-body">
        <SectionHead title="Qué datos se pueden sincronizar" hint="Lo que expone la API de Pancake POS." />
        <ul className="sync-data">
          {SYNCABLE.map((item) => (
            <li key={item.data}>
              <div className="d-flex align-items-center justify-content-between gap-2">
                <span className="fw-semibold text-body-emphasis">{item.data}</span>
                <span className={`badge ${item.ready ? "bg-success-subtle text-success-emphasis" : "bg-secondary-subtle text-secondary-emphasis"}`}>
                  {item.ready ? "Disponible" : "Próximamente"}
                </span>
              </div>
              <p className="small text-body-secondary mb-1">{item.detail}</p>
              <code className="small">GET {item.endpoint}</code>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- CPA

export function PancakeCpaExplainer() {
  return (
    <div className="card">
      <div className="card-body">
        <SectionHead title="Cómo se calcula el CPA" hint="Costo por adquisición con órdenes reales." />
        <p className="guide-formula">
          CPA = inversión en pauta ÷ órdenes atribuidas
        </p>
        <ul className="small ps-3 mb-3">
          <li>
            <strong>Órdenes atribuidas:</strong> las creadas en el período, sin contar las canceladas, eliminadas, en devolución
            o devueltas.
          </li>
          <li>
            <strong>Por producto:</strong> si indicas un producto, solo cuentan las órdenes que lo incluyen; escribe la inversión
            de la campaña de ese producto.
          </li>
          <li>
            <strong>Solo anuncios:</strong> opcionalmente cuentan solo las órdenes que Pancake asocia a un anuncio o campaña.
          </li>
          <li>
            <strong>ROAS</strong> = ingresos de esas órdenes ÷ inversión.
          </li>
        </ul>
        <p className="small text-body-secondary mb-0">
          Ejemplo: invertiste $450.000 en la semana y entraron 30 órdenes válidas → CPA de $15.000 por orden.
        </p>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- Referencia técnica

const STATUSES: { codes: string; name: string; app: string; counts: boolean }[] = [
  { codes: "0, 1, 8, 9, 11, 12, 13, 17, 20", name: "Nuevo, confirmado, empacando, esperando…", app: "Pendiente", counts: true },
  { codes: "2", name: "Enviado a la transportadora", app: "Enviado", counts: true },
  { codes: "3, 15, 16", name: "Entregado, devolución parcial, recaudado", app: "Pagado", counts: true },
  { codes: "4, 5, 6, 7", name: "En devolución, devuelto, cancelado, eliminado", app: "Cancelado", counts: false },
];

export function PancakeReference() {
  return (
    <div className="card">
      <div className="card-body">
        <SectionHead title="Referencia técnica" hint="Para quien mantenga o extienda la integración." />
        <div className="row g-4">
          <div className="col-xl-6">
            <h3 className="h6">Endpoint interno de CentralApp</h3>
            <p className="small text-body-secondary">
              Route Handler en <code>app/api/pancake/orders/route.ts</code>. Exige sesión y el permiso{" "}
              <code>integrations.sync</code>.
            </p>
            <pre className="guide-code">
              <code>{`GET /api/pancake/orders
  ?from=2026-11-01T00:00:00-05:00
  &to=2026-11-07T23:59:59-05:00
  &spend=450000          # inversión → CPA y ROAS
  &product=Camiseta      # opcional: ID, SKU o nombre
  &onlyAds=1             # opcional: solo órdenes con anuncio
  &integrationId=…       # opcional: por defecto la primera activa`}</code>
            </pre>

            <h3 className="h6 mt-4">Lo que el servidor le pide a Pancake</h3>
            <pre className="guide-code">
              <code>{`# Al pegar la API key: tiendas de esa clave → Shop ID
GET ${PANCAKE_API}/shops?api_key=…
  → { success, shops: [{ id, name, currency, … }] }

# Órdenes del período
GET ${PANCAKE_API}/shops/{shop_id}/orders
  ?api_key=…               # se agrega en el servidor
  &startDateTime=1793509200  # segundos Unix
  &endDateTime=1794113999
  &updateStatus=inserted_at  # filtra por fecha de creación
  &page_size=100&page_number=1`}</code>
            </pre>
            <p className="small text-body-secondary mb-0">
              Se recorren las páginas hasta <code>total_pages</code> (máx. 3.000 órdenes por consulta) y el rango admite hasta
              93 días. Cada orden se traduce a la forma <code>AppOrder</code> de <code>lib/orders.ts</code>.
            </p>
          </div>

          <div className="col-xl-6">
            <h3 className="h6">Estados de Pancake → estados de la app</h3>
            <div className="table-responsive">
              <table className="table table-admin table-sm align-middle">
                <thead>
                  <tr>
                    <th scope="col">Código</th>
                    <th scope="col">En Pancake</th>
                    <th scope="col">En la app</th>
                    <th scope="col">CPA</th>
                  </tr>
                </thead>
                <tbody>
                  {STATUSES.map((status) => (
                    <tr key={status.codes}>
                      <td>
                        <code>{status.codes}</code>
                      </td>
                      <td className="small">{status.name}</td>
                      <td className="small">{status.app}</td>
                      <td className="small">{status.counts ? "Cuenta" : "No cuenta"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="h6 mt-4">Dónde vive cada pieza</h3>
            <ul className="small ps-3 mb-0">
              <li>
                <code>integrations</code> (tabla): proveedor, nombre, Shop ID, api_key, estado, última sincronización y último error.
              </li>
              <li>
                <code>lib/server/integrations/pancake.ts</code>: llamadas a la API, paginación y normalización.
              </li>
              <li>
                <code>lib/integrations/metrics.ts</code>: cálculo de CPA y ROAS (reutilizable en un simulador).
              </li>
              <li>
                Pendiente: cifrar <code>api_key</code> en la base de datos; hoy se guarda en texto plano y solo la lee el servidor.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
