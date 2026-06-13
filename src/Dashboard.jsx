import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "./api";
import LoadingState from "./LoadingState";
import { formatMoney, loadPreferences } from "./preferences";

function money(value) {
  return formatMoney(value, loadPreferences());
}

function formatDate(value) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function Dashboard() {
  const [gastos, setGastos] = useState([]);
  const [totalMes, setTotalMes] = useState(0);
  const [presupuestos, setPresupuestos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/gastos")
      .then((res) => res.json())
      .then((data) => setGastos(data))
      .catch((err) => console.error("Error al cargar gastos:", err))
      .finally(() => setLoading(false));

    apiFetch("/reportes/total-mes")
      .then((res) => res.json())
      .then((data) => setTotalMes(Number(data.total) || 0))
      .catch((err) => console.error("Error al cargar total:", err));

    apiFetch(`/presupuestos?mes=${new Date().toISOString().slice(0, 7)}`)
      .then((res) => res.json())
      .then((data) => setPresupuestos(data))
      .catch((err) => console.error("Error al cargar presupuestos:", err));
  }, []);

  const resumen = useMemo(() => {
    const ordenados = [...gastos].sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora));
    const totalHistorico = gastos.reduce((total, gasto) => total + Number(gasto.monto), 0);
    const promedio = gastos.length > 0 ? totalHistorico / gastos.length : 0;
    const ultimo = ordenados[0];
    const porCategoria = new Map();

    gastos.forEach((gasto) => {
      const categoria = gasto.categoria_nombre || "Sin categoria";
      porCategoria.set(categoria, (porCategoria.get(categoria) || 0) + Number(gasto.monto));
    });

    const categoriaPrincipal = Array.from(porCategoria, ([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total)[0];

    const alertas = presupuestos.filter((presupuesto) => {
      const totalCategoria = gastos
        .filter((gasto) => gasto.categoria_id === presupuesto.categoria_id)
        .reduce((total, gasto) => total + Number(gasto.monto), 0);
      return totalCategoria > Number(presupuesto.monto_limite);
    });

    let salud = "Bajo control";
    if (alertas.length > 0) salud = "Revisar presupuestos";
    else if (promedio > 0 && totalMes > promedio * 12) salud = "Gasto elevado";

    return {
      ultimo,
      promedio,
      categoriaPrincipal,
      alertas,
      salud,
      recientes: ordenados.slice(0, 5),
    };
  }, [gastos, presupuestos, totalMes]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="overflow-hidden rounded-[28px] bg-[#206a5d] p-7 text-white shadow-2xl shadow-emerald-950/10 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-white/90">
              Inicio
            </span>
            <h1 className="mt-4 text-4xl font-black tracking-tight">Tu panorama financiero</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/78">
              Un vistazo rapido a tus movimientos, tus habitos y las acciones mas utiles del dia.
            </p>
          </div>
          <Link to="/agregar-gasto" className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 font-black text-[#206a5d] shadow-xl shadow-emerald-950/10 transition-colors hover:bg-[#edf5ef]">
            Agregar gasto
          </Link>
        </div>
      </section>

      {loading && <LoadingState lines={4} />}

      {!loading && <section className="grid gap-4 md:grid-cols-4">
        <div className="panel rounded-[24px] p-5">
          <p className="text-sm font-black uppercase tracking-wide text-[#66756f]">Total del mes</p>
          <p className="mt-3 text-3xl font-black text-[#17201c]">{money(totalMes)}</p>
        </div>
        <div className="panel rounded-[24px] p-5">
          <p className="text-sm font-black uppercase tracking-wide text-[#66756f]">Promedio</p>
          <p className="mt-3 text-3xl font-black text-[#17201c]">{money(resumen.promedio)}</p>
        </div>
        <div className="panel rounded-[24px] p-5">
          <p className="text-sm font-black uppercase tracking-wide text-[#66756f]">Categoria top</p>
          <p className="mt-3 truncate text-2xl font-black text-[#17201c]">{resumen.categoriaPrincipal?.nombre || "Sin datos"}</p>
          <p className="mt-1 text-sm font-bold text-[#66756f]">{money(resumen.categoriaPrincipal?.total)}</p>
        </div>
        <div className="panel rounded-[24px] p-5">
          <p className="text-sm font-black uppercase tracking-wide text-[#66756f]">Estado</p>
          <p className="mt-3 text-2xl font-black text-[#17201c]">{resumen.salud}</p>
          <p className="mt-1 text-sm font-bold text-[#66756f]">{resumen.alertas.length} alertas</p>
        </div>
      </section>}

      {!loading && <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="panel rounded-[24px] p-5 sm:p-6">
          <h2 className="text-xl font-black text-[#17201c]">Acciones rapidas</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link to="/agregar-gasto" className="secondary-button justify-start">Registrar movimiento</Link>
            <Link to="/total-gastado" className="secondary-button justify-start">Ver resumen completo</Link>
            <Link to="/categoria" className="secondary-button justify-start">Gestionar categorias</Link>
            <Link to="/eliminar-registros" className="secondary-button justify-start">Exportar registros</Link>
          </div>
          <div className="mt-6">
            <p className="text-sm font-black uppercase tracking-wide text-[#66756f]">Atajos de captura</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                ["Comida", "Comida rapida"],
                ["Transporte", "Transporte"],
                ["Servicios", "Pago de servicio"],
              ].map(([label, descripcion]) => (
                <Link
                  key={label}
                  to="/agregar-gasto"
                  state={{ prefill: { descripcion } }}
                  className="secondary-button justify-start text-sm"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="panel rounded-[24px] p-5 sm:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-[#17201c]">Actividad reciente</h2>
              <p className="mt-1 text-sm font-semibold text-[#66756f]">Tus ultimos movimientos registrados.</p>
            </div>
            <span className="text-sm font-black text-[#206a5d]">{gastos.length}</span>
          </div>

          <div className="mt-5 space-y-3">
            {resumen.recientes.map((gasto) => (
              <div key={gasto.id} className="flex items-center justify-between gap-4 rounded-2xl border border-[#edf3ef] bg-[#fbfdfb] p-4">
                <span className="min-w-0">
                  <span className="block truncate font-black text-[#2b3b35]">{gasto.descripcion}</span>
                  <span className="mt-1 block text-xs font-bold text-[#66756f]">{formatDate(gasto.fecha_hora)} - {gasto.categoria_nombre || "Sin categoria"}</span>
                </span>
                <span className="shrink-0 font-black text-[#206a5d]">{money(gasto.monto)}</span>
              </div>
            ))}
            {resumen.recientes.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#d8e3dc] bg-[#fbfdfb] p-6 text-center text-sm font-semibold text-[#66756f]">
                Aun no hay movimientos. Agrega el primero para iniciar tu resumen.
                <Link to="/agregar-gasto" className="primary-button mt-4 w-full">
                  Agregar primer gasto
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>}
    </div>
  );
}
