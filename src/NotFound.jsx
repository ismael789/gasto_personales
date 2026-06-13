import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-3xl place-items-center">
      <section className="panel rounded-[28px] p-8 text-center">
        <span className="rounded-full bg-[#edf5ef] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#206a5d]">
          404
        </span>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-[#17201c]">Pagina no encontrada</h1>
        <p className="mt-3 text-sm leading-6 text-[#66756f]">
          La ruta que abriste no existe o ya no esta disponible.
        </p>
        <Link to="/inicio" className="primary-button mt-6">
          Volver al inicio
        </Link>
      </section>
    </div>
  );
}
