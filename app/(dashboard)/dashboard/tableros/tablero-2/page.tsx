import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tablero 2",
};

export default function Tablero2Page() {
  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow mb-0">Tableros</p>
          <h1>Tablero 2</h1>
        </div>
      </header>
      <section className="card" aria-label="Tablero 2">
        <div className="card-body" style={{ minHeight: "16rem" }} />
      </section>
    </>
  );
}
