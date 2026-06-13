import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "./api";
import { Toast } from "./Feedback";
import LoadingState from "./LoadingState";
import { formatMoney, loadPreferences } from "./preferences";

function money(value, preferences) {
  return formatMoney(value, preferences);
}

function csvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function dateKey(value) {
  return String(value || "").slice(0, 10);
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

function formatDateTime(value) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function ChartEmpty({ text = "Aun no hay datos suficientes." }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-[#d8e3dc] bg-[#fbfdfb] p-6 text-center text-sm font-semibold text-[#66756f]">
      {text}
    </div>
  );
}

function CategoryBars({ items }) {
  const max = Math.max(...items.map((item) => item.total), 0);

  if (items.length === 0) {
    return <ChartEmpty text="Registra gastos para ver tus categorias principales." />;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const percent = max > 0 ? Math.max((item.total / max) * 100, 6) : 0;

        return (
          <div key={item.name}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-black text-[#2b3b35]">{item.name}</span>
              <span className="font-black text-[#206a5d]">{money(item.total)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#edf5ef]">
              <div
                className="h-full rounded-full bg-[#206a5d]"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrendChart({ points }) {
  const max = Math.max(...points.map((point) => point.total), 0);

  if (points.every((point) => point.total === 0)) {
    return <ChartEmpty text="La tendencia aparecera cuando tengas movimientos recientes." />;
  }

  const svgPoints = points
    .map((point, index) => {
      const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
      const y = max > 0 ? 88 - (point.total / max) * 68 : 88;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div>
      <svg className="h-48 w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={svgPoints} fill="none" stroke="#206a5d" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {points.map((point, index) => {
          const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
          const y = max > 0 ? 88 - (point.total / max) * 68 : 88;
          return <circle key={point.label} cx={x} cy={y} r="2.2" fill="#d69e2e" vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      <div className="mt-3 grid grid-cols-7 gap-2 text-center text-xs font-bold text-[#66756f]">
        {points.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </div>
  );
}

function PaymentSummary({ items }) {
  if (items.length === 0) {
    return <ChartEmpty text="Tus metodos de pago apareceran aqui." />;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.name} className="rounded-2xl border border-[#edf3ef] bg-[#fbfdfb] p-4">
          <p className="text-sm font-black text-[#2b3b35]">{item.name}</p>
          <p className="mt-2 text-2xl font-black text-[#206a5d]">{money(item.total)}</p>
          <p className="mt-1 text-xs font-bold text-[#66756f]">{item.count} movimiento{item.count === 1 ? "" : "s"}</p>
        </div>
      ))}
    </div>
  );
}

function MonthCalendar({ days, preferences }) {
  const max = Math.max(...days.map((day) => day.total), 0);

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => {
        const intensity = max > 0 ? day.total / max : 0;
        const background = intensity > 0.66 ? "bg-[#206a5d] text-white" : intensity > 0.25 ? "bg-[#dff0e8] text-[#17201c]" : "bg-[#fbfdfb] text-[#66756f]";

        return (
          <div key={day.key} className={`min-h-20 rounded-2xl border border-[#edf3ef] p-2 ${background}`}>
            <p className="text-xs font-black">{day.day}</p>
            <p className="mt-2 text-xs font-bold">{day.total > 0 ? money(day.total, preferences) : "-"}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function TotalGastado() {
  const location = useLocation();
  const [gastos, setGastos] = useState([]);
  const [totalMes, setTotalMes] = useState(0);
  const [categorias, setCategorias] = useState([]);
  const [etiquetas, setEtiquetas] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroEtiqueta, setFiltroEtiqueta] = useState("");
  const [busqueda, setBusqueda] = useState(location.state?.busqueda || "");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [orden, setOrden] = useState("recientes");
  const [preferences, setPreferences] = useState(loadPreferences);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [savedFilters, setSavedFilters] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("gastos_saved_filters") || "[]");
    } catch {
      return [];
    }
  });
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3600);
  };

  useEffect(() => {
    apiFetch("/reportes/total-mes")
      .then((res) => res.json())
      .then((data) => setTotalMes(Number(data.total) || 0));

    apiFetch("/categorias")
      .then((res) => res.json())
      .then((data) => setCategorias(data));

    apiFetch("/etiquetas")
      .then((res) => res.json())
      .then((data) => setEtiquetas(data));

    apiFetch(`/presupuestos?mes=${new Date().toISOString().slice(0, 7)}`)
      .then((res) => res.json())
      .then((data) => setPresupuestos(data));

    apiFetch("/gastos")
      .then((res) => res.json())
      .then((data) => setGastos(data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (location.state?.busqueda !== undefined) {
      setBusqueda(location.state.busqueda);
      setCurrentPage(1);
    }
  }, [location.state]);

  useEffect(() => {
    const syncPreferences = () => setPreferences(loadPreferences());
    window.addEventListener("storage", syncPreferences);
    window.addEventListener("focus", syncPreferences);
    return () => {
      window.removeEventListener("storage", syncPreferences);
      window.removeEventListener("focus", syncPreferences);
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [busqueda, fechaDesde, fechaHasta, filtroCategoria, filtroEtiqueta, orden]);

  const gastosFiltrados = useMemo(() => {
    return gastos.filter((gasto) => {
      const coincideCategoria = filtroCategoria === "" || gasto.categoria_id === parseInt(filtroCategoria);
      const coincideEtiqueta = filtroEtiqueta === "" || (gasto.etiquetas || []).some((etiqueta) => etiqueta.id === parseInt(filtroEtiqueta));
      const coincideDescripcion = gasto.descripcion.toLowerCase().includes(busqueda.toLowerCase());
      const fecha = dateKey(gasto.fecha_hora);
      const coincideDesde = fechaDesde === "" || fecha >= fechaDesde;
      const coincideHasta = fechaHasta === "" || fecha <= fechaHasta;
      return coincideCategoria && coincideEtiqueta && coincideDescripcion && coincideDesde && coincideHasta;
    });
  }, [busqueda, fechaDesde, fechaHasta, filtroCategoria, filtroEtiqueta, gastos]);

  const gastosOrdenados = useMemo(() => {
    return [...gastosFiltrados].sort((a, b) => {
      if (orden === "monto-desc") return Number(b.monto) - Number(a.monto);
      if (orden === "monto-asc") return Number(a.monto) - Number(b.monto);
      if (orden === "antiguos") return new Date(a.fecha_hora) - new Date(b.fecha_hora);
      return new Date(b.fecha_hora) - new Date(a.fecha_hora);
    });
  }, [gastosFiltrados, orden]);

  const alertasPresupuesto = useMemo(() => {
    return presupuestos
      .map((presupuesto) => {
        const totalCategoria = gastos
          .filter((gasto) => gasto.categoria_id === presupuesto.categoria_id)
          .reduce((total, gasto) => total + Number(gasto.monto), 0);

        return {
          ...presupuesto,
          totalCategoria,
          excedido: totalCategoria > Number(presupuesto.monto_limite),
        };
      })
      .filter((presupuesto) => presupuesto.excedido);
  }, [gastos, presupuestos]);

  const totalFiltrado = useMemo(() => {
    return gastosFiltrados.reduce((total, gasto) => total + Number(gasto.monto), 0);
  }, [gastosFiltrados]);

  const gastoMayor = useMemo(() => {
    return gastosFiltrados.reduce((mayor, gasto) => {
      return Number(gasto.monto) > Number(mayor?.monto || 0) ? gasto : mayor;
    }, null);
  }, [gastosFiltrados]);

  const promedioFiltrado = gastosFiltrados.length > 0 ? totalFiltrado / gastosFiltrados.length : 0;
  const pageSize = Number(preferences.pageSize || 10);
  const totalPages = Math.max(1, Math.ceil(gastosOrdenados.length / pageSize));
  const gastosPaginados = gastosOrdenados.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const compactPadding = preferences.density === "compact" ? "p-3" : "p-5";

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const categoriasGrafica = useMemo(() => {
    const totals = new Map();

    gastosFiltrados.forEach((gasto) => {
      const name = gasto.categoria_nombre || "Sin categoria";
      totals.set(name, (totals.get(name) || 0) + Number(gasto.monto));
    });

    return Array.from(totals, ([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [gastosFiltrados]);

  const metodosGrafica = useMemo(() => {
    const totals = new Map();

    gastosFiltrados.forEach((gasto) => {
      const name = gasto.metodo_pago_nombre || "Sin metodo";
      const current = totals.get(name) || { name, total: 0, count: 0 };
      totals.set(name, {
        ...current,
        total: current.total + Number(gasto.monto),
        count: current.count + 1,
      });
    });

    return Array.from(totals.values()).sort((a, b) => b.total - a.total).slice(0, 4);
  }, [gastosFiltrados]);

  const etiquetasGrafica = useMemo(() => {
    const totals = new Map();

    gastosFiltrados.forEach((gasto) => {
      (gasto.etiquetas || []).forEach((etiqueta) => {
        const current = totals.get(etiqueta.nombre) || { name: etiqueta.nombre, total: 0, count: 0 };
        totals.set(etiqueta.nombre, {
          ...current,
          total: current.total + Number(gasto.monto),
          count: current.count + 1,
        });
      });
    });

    return Array.from(totals.values()).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [gastosFiltrados]);

  const insights = useMemo(() => {
    const topCategoria = categoriasGrafica[0];
    const topEtiqueta = etiquetasGrafica[0];
    const recurrentes = gastosFiltrados.filter((gasto) => Boolean(gasto.es_recurrente)).length;
    const porcentajeTop = totalFiltrado > 0 && topCategoria ? Math.round((topCategoria.total / totalFiltrado) * 100) : 0;

    return {
      topCategoria,
      topEtiqueta,
      recurrentes,
      porcentajeTop,
    };
  }, [categoriasGrafica, etiquetasGrafica, gastosFiltrados, totalFiltrado]);

  const tendenciaGrafica = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("es-MX", { weekday: "short" });
    const today = new Date();

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      const total = gastosFiltrados
        .filter((gasto) => String(gasto.fecha_hora || "").slice(0, 10) === key)
        .reduce((sum, gasto) => sum + Number(gasto.monto), 0);

      return {
        label: formatter.format(date).replace(".", ""),
        total,
      };
    });
  }, [gastosFiltrados]);

  const comparacionMes = useMemo(() => {
    const now = new Date();
    const mesActual = now.toISOString().slice(0, 7);
    const mesAnteriorDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const mesAnterior = mesAnteriorDate.toISOString().slice(0, 7);

    const actual = gastos
      .filter((gasto) => String(gasto.fecha_hora || "").slice(0, 7) === mesActual)
      .reduce((sum, gasto) => sum + Number(gasto.monto), 0);
    const anterior = gastos
      .filter((gasto) => String(gasto.fecha_hora || "").slice(0, 7) === mesAnterior)
      .reduce((sum, gasto) => sum + Number(gasto.monto), 0);
    const diferencia = actual - anterior;
    const porcentaje = anterior > 0 ? Math.round((diferencia / anterior) * 100) : null;

    return { actual, anterior, diferencia, porcentaje };
  }, [gastos]);

  const calendarioMes = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: lastDay }, (_, index) => {
      const date = new Date(year, month, index + 1);
      const key = date.toISOString().slice(0, 10);
      const total = gastos
        .filter((gasto) => dateKey(gasto.fecha_hora) === key)
        .reduce((sum, gasto) => sum + Number(gasto.monto), 0);

      return { key, day: index + 1, total };
    });
  }, [gastos]);

  const habitos = useMemo(() => {
    const dias = new Map();
    const metodos = new Map();
    const categorias = new Map();
    const descripciones = new Map();
    const weekday = new Intl.DateTimeFormat("es-MX", { weekday: "long" });

    gastos.forEach((gasto) => {
      const amount = Number(gasto.monto);
      const date = new Date(gasto.fecha_hora);
      const dayName = Number.isNaN(date.getTime()) ? "Sin fecha" : weekday.format(date);
      const metodo = gasto.metodo_pago_nombre || "Sin metodo";
      const categoria = gasto.categoria_nombre || "Sin categoria";
      const descripcion = gasto.descripcion || "Sin descripcion";

      dias.set(dayName, (dias.get(dayName) || 0) + amount);
      metodos.set(metodo, (metodos.get(metodo) || 0) + 1);
      categorias.set(categoria, (categorias.get(categoria) || { total: 0, count: 0 }));
      categorias.get(categoria).total += amount;
      categorias.get(categoria).count += 1;
      descripciones.set(descripcion, (descripciones.get(descripcion) || 0) + 1);
    });

    const topMap = (map) => Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => {
      const av = typeof a.value === "number" ? a.value : a.value.total;
      const bv = typeof b.value === "number" ? b.value : b.value.total;
      return bv - av;
    })[0];

    const categoriaPromedio = Array.from(categorias, ([name, value]) => ({
      name,
      value: value.count > 0 ? value.total / value.count : 0,
    })).sort((a, b) => b.value - a.value)[0];

    return {
      diaTop: topMap(dias),
      metodoTop: topMap(metodos),
      categoriaPromedio,
      gastoFrecuente: topMap(descripciones),
    };
  }, [gastos]);

  const descargarFiltrados = () => {
    const encabezados = ["descripcion", "monto", "categoria", "metodo_pago", "etiquetas", "nota", "fecha_hora"];
    const filas = gastosOrdenados.map((gasto) => [
      gasto.descripcion,
      gasto.monto,
      gasto.categoria_nombre || "",
      gasto.metodo_pago_nombre || "",
      (gasto.etiquetas || []).map((etiqueta) => etiqueta.nombre).join(", "),
      gasto.nota || "",
      gasto.fecha_hora,
    ]);
    const contenido = [encabezados, ...filas].map((fila) => fila.map(csvValue).join(",")).join("\n");
    const blob = new Blob([contenido], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gastos_filtrados.csv";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Vista exportada correctamente.");
  };

  const guardarVistaActual = () => {
    const nombre = `Vista ${savedFilters.length + 1}`;
    const next = [
      ...savedFilters,
      { nombre, busqueda, filtroCategoria, filtroEtiqueta, fechaDesde, fechaHasta, orden },
    ].slice(-5);
    setSavedFilters(next);
    localStorage.setItem("gastos_saved_filters", JSON.stringify(next));
    showToast("Vista guardada.");
  };

  const aplicarVistaGuardada = (vista) => {
    setBusqueda(vista.busqueda || "");
    setFiltroCategoria(vista.filtroCategoria || "");
    setFiltroEtiqueta(vista.filtroEtiqueta || "");
    setFechaDesde(vista.fechaDesde || "");
    setFechaHasta(vista.fechaHasta || "");
    setOrden(vista.orden || "recientes");
  };

  const aplicarRangoRapido = (tipo) => {
    const hoy = new Date();
    const toKey = (date) => date.toISOString().slice(0, 10);

    if (tipo === "todo") {
      setFechaDesde("");
      setFechaHasta("");
      return;
    }

    const desde = new Date(hoy);

    if (tipo === "hoy") {
      setFechaDesde(toKey(hoy));
      setFechaHasta(toKey(hoy));
      return;
    }

    if (tipo === "semana") desde.setDate(hoy.getDate() - 6);
    if (tipo === "mes") desde.setDate(1);
    if (tipo === "30") desde.setDate(hoy.getDate() - 29);

    setFechaDesde(toKey(desde));
    setFechaHasta(toKey(hoy));
  };

  const imprimirReporte = () => {
    showToast("Abriendo vista de impresion.");
    window.print();
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroCategoria("");
    setFiltroEtiqueta("");
    setFechaDesde("");
    setFechaHasta("");
    setOrden("recientes");
    showToast("Filtros limpiados.");
  };

  const duplicarGasto = (gasto) => {
    navigate("/agregar-gasto", {
      state: {
        prefill: {
          monto: gasto.monto,
          descripcion: `${gasto.descripcion} (copia)`,
          categoria_id: gasto.categoria_id,
          metodo_pago_id: gasto.metodo_pago_id,
          nota: gasto.nota,
          etiquetas: gasto.etiquetas,
        },
      },
    });
  };

  const filtrosActivos = [
    busqueda && `Busqueda: ${busqueda}`,
    filtroCategoria && `Categoria: ${categorias.find((cat) => String(cat.id) === String(filtroCategoria))?.nombre || filtroCategoria}`,
    filtroEtiqueta && `Etiqueta: ${etiquetas.find((tag) => String(tag.id) === String(filtroEtiqueta))?.nombre || filtroEtiqueta}`,
    fechaDesde && `Desde: ${fechaDesde}`,
    fechaHasta && `Hasta: ${fechaHasta}`,
    orden !== "recientes" && `Orden: ${orden}`,
  ].filter(Boolean);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
      <div className="overflow-hidden rounded-[28px] bg-[#206a5d] p-7 text-white shadow-2xl shadow-emerald-950/10 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-white/90">
              Este mes
            </span>
            <h2 className="mt-4 text-lg font-bold text-white/75">Total gastado</h2>
            <p className="mt-2 text-5xl font-black tracking-tight">{money(totalMes, preferences)}</p>
          </div>
          <div className="max-w-sm rounded-2xl bg-white/12 p-4 text-sm leading-6 text-white/78">
            Revisa tus movimientos y filtra por categoria, etiqueta o descripcion para encontrar lo importante rapido.
          </div>
        </div>
      </div>

      {alertasPresupuesto.length > 0 && (
        <div className="rounded-[24px] border border-red-100 bg-red-50 p-5">
          <h3 className="font-black text-red-800">Presupuestos excedidos</h3>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {alertasPresupuesto.map((presupuesto) => (
              <div key={presupuesto.id} className="rounded-2xl border border-red-100 bg-white p-4 text-sm font-semibold text-red-700">
                <span className="font-bold">{presupuesto.categoria_nombre || "Categoria"}</span>: ${presupuesto.totalCategoria.toFixed(2)} / ${Number(presupuesto.monto_limite).toFixed(2)}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel rounded-[24px] p-5">
          <p className="text-sm font-black uppercase tracking-wide text-[#66756f]">Total filtrado</p>
          <p className="mt-3 text-3xl font-black text-[#17201c]">{money(totalFiltrado)}</p>
        </div>
        <div className="panel rounded-[24px] p-5">
          <p className="text-sm font-black uppercase tracking-wide text-[#66756f]">Promedio</p>
          <p className="mt-3 text-3xl font-black text-[#17201c]">{money(promedioFiltrado)}</p>
        </div>
        <div className="panel rounded-[24px] p-5">
          <p className="text-sm font-black uppercase tracking-wide text-[#66756f]">Mayor gasto</p>
          <p className="mt-3 truncate text-3xl font-black text-[#17201c]">{money(gastoMayor?.monto)}</p>
          <p className="mt-1 truncate text-sm font-bold text-[#66756f]">{gastoMayor?.descripcion || "Sin movimientos"}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="panel rounded-[24px] p-5 lg:col-span-2">
          <p className="text-sm font-black uppercase tracking-wide text-[#66756f]">Categoria dominante</p>
          <p className="mt-3 text-2xl font-black text-[#17201c]">{insights.topCategoria?.name || "Sin datos"}</p>
          <p className="mt-2 text-sm font-semibold text-[#66756f]">
            {insights.topCategoria ? `${insights.porcentajeTop}% del gasto visible (${money(insights.topCategoria.total)})` : "Agrega movimientos para ver este dato."}
          </p>
        </div>
        <div className="panel rounded-[24px] p-5">
          <p className="text-sm font-black uppercase tracking-wide text-[#66756f]">Etiqueta principal</p>
          <p className="mt-3 truncate text-2xl font-black text-[#17201c]">{insights.topEtiqueta?.name || "Sin etiquetas"}</p>
          <p className="mt-2 text-sm font-semibold text-[#66756f]">{insights.topEtiqueta ? money(insights.topEtiqueta.total) : "Sin datos aun"}</p>
        </div>
        <div className="panel rounded-[24px] p-5">
          <p className="text-sm font-black uppercase tracking-wide text-[#66756f]">Recurrentes</p>
          <p className="mt-3 text-2xl font-black text-[#17201c]">{insights.recurrentes}</p>
          <p className="mt-2 text-sm font-semibold text-[#66756f]">movimientos visibles</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="panel rounded-[24px] p-5 md:col-span-2">
          <p className="text-sm font-black uppercase tracking-wide text-[#66756f]">Comparacion mensual</p>
          <p className="mt-3 text-3xl font-black text-[#17201c]">{money(comparacionMes.diferencia, preferences)}</p>
          <p className="mt-2 text-sm font-semibold text-[#66756f]">
            Mes actual {money(comparacionMes.actual, preferences)} vs anterior {money(comparacionMes.anterior, preferences)}
            {comparacionMes.porcentaje !== null ? ` (${comparacionMes.porcentaje > 0 ? "+" : ""}${comparacionMes.porcentaje}%)` : ""}
          </p>
        </div>
        <div className="panel rounded-[24px] p-5">
          <p className="text-sm font-black uppercase tracking-wide text-[#66756f]">Dia mas caro</p>
          <p className="mt-3 text-2xl font-black capitalize text-[#17201c]">{habitos.diaTop?.name || "Sin datos"}</p>
          <p className="mt-2 text-sm font-semibold text-[#66756f]">{habitos.diaTop ? money(habitos.diaTop.value, preferences) : "-"}</p>
        </div>
        <div className="panel rounded-[24px] p-5">
          <p className="text-sm font-black uppercase tracking-wide text-[#66756f]">Metodo favorito</p>
          <p className="mt-3 text-2xl font-black text-[#17201c]">{habitos.metodoTop?.name || "Sin datos"}</p>
          <p className="mt-2 text-sm font-semibold text-[#66756f]">{habitos.metodoTop ? `${habitos.metodoTop.value} usos` : "-"}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="panel rounded-[24px] p-5 sm:p-6">
          <div className="mb-5">
            <h3 className="text-xl font-black text-[#17201c]">Gasto por categoria</h3>
            <p className="mt-1 text-sm font-semibold text-[#66756f]">Tus categorias con mas peso en los filtros actuales.</p>
          </div>
          <CategoryBars items={categoriasGrafica} />
        </section>

        <section className="panel rounded-[24px] p-5 sm:p-6">
          <div className="mb-5">
            <h3 className="text-xl font-black text-[#17201c]">Tendencia semanal</h3>
            <p className="mt-1 text-sm font-semibold text-[#66756f]">Movimiento diario de los ultimos 7 dias.</p>
          </div>
          <TrendChart points={tendenciaGrafica} />
        </section>
      </div>

      <section className="panel rounded-[24px] p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-black text-[#17201c]">Metodos de pago</h3>
            <p className="mt-1 text-sm font-semibold text-[#66756f]">Distribucion segun los registros visibles.</p>
          </div>
          <span className="text-sm font-black text-[#206a5d]">{gastosFiltrados.length} movimientos</span>
        </div>
        <PaymentSummary items={metodosGrafica} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="panel rounded-[24px] p-5 sm:p-6">
          <div className="mb-5">
            <h3 className="text-xl font-black text-[#17201c]">Calendario del mes</h3>
            <p className="mt-1 text-sm font-semibold text-[#66756f]">Cada dia muestra el total gastado.</p>
          </div>
          <MonthCalendar days={calendarioMes} preferences={preferences} />
        </div>

        <div className="panel rounded-[24px] p-5 sm:p-6">
          <div className="mb-5">
            <h3 className="text-xl font-black text-[#17201c]">Panel de habitos</h3>
            <p className="mt-1 text-sm font-semibold text-[#66756f]">Patrones calculados desde tus movimientos.</p>
          </div>
          <div className="grid gap-3">
            <div className="rounded-2xl border border-[#edf3ef] bg-[#fbfdfb] p-4">
              <p className="text-sm font-black text-[#2b3b35]">Categoria con mayor promedio</p>
              <p className="mt-1 text-sm font-semibold text-[#66756f]">{habitos.categoriaPromedio?.name || "Sin datos"} - {habitos.categoriaPromedio ? money(habitos.categoriaPromedio.value, preferences) : "-"}</p>
            </div>
            <div className="rounded-2xl border border-[#edf3ef] bg-[#fbfdfb] p-4">
              <p className="text-sm font-black text-[#2b3b35]">Descripcion mas frecuente</p>
              <p className="mt-1 text-sm font-semibold text-[#66756f]">{habitos.gastoFrecuente?.name || "Sin datos"} {habitos.gastoFrecuente ? `(${habitos.gastoFrecuente.value})` : ""}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="panel rounded-[24px] p-5 sm:p-6">
          <div className="mb-5">
            <h3 className="text-xl font-black text-[#17201c]">Etiquetas frecuentes</h3>
            <p className="mt-1 text-sm font-semibold text-[#66756f]">Temas que mas se repiten en tus gastos.</p>
          </div>
          {etiquetasGrafica.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {etiquetasGrafica.map((etiqueta) => (
                <span key={etiqueta.name} className="rounded-full border border-[#d8e3dc] bg-[#fbfdfb] px-4 py-2 text-sm font-black text-[#2b3b35]">
                  {etiqueta.name} - {etiqueta.count}
                </span>
              ))}
            </div>
          ) : (
            <ChartEmpty text="Usa etiquetas al registrar gastos para verlas aqui." />
          )}
        </section>

        <section className="panel rounded-[24px] p-5 sm:p-6">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-[#17201c]">Actividad reciente</h3>
              <p className="mt-1 text-sm font-semibold text-[#66756f]">Ultimos movimientos segun tus filtros.</p>
            </div>
            <span className="text-sm font-black text-[#206a5d]">{gastosOrdenados.length}</span>
          </div>
          {gastosOrdenados.length > 0 ? (
            <div className="space-y-3">
              {gastosOrdenados.slice(0, 5).map((gasto) => (
                <button
                  key={gasto.id}
                  type="button"
                  onClick={() => navigate("/agregar-gasto", { state: { gastoParaEditar: gasto } })}
                  className="flex w-full items-center justify-between gap-4 rounded-2xl border border-[#edf3ef] bg-[#fbfdfb] p-4 text-left transition-colors hover:bg-[#f1f7f3]"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-black text-[#2b3b35]">{gasto.descripcion}</span>
                    <span className="mt-1 block text-xs font-bold text-[#66756f]">{formatDate(gasto.fecha_hora)} - {gasto.categoria_nombre || "Sin categoria"}</span>
                  </span>
                  <span className="shrink-0 font-black text-[#206a5d]">{money(gasto.monto)}</span>
                </button>
              ))}
            </div>
          ) : (
            <ChartEmpty text="No hay movimientos con los filtros actuales." />
          )}
        </section>
      </div>

      <div className="panel print:hidden flex flex-col items-center justify-between gap-4 rounded-[24px] p-5 lg:flex-row">
        <div className="flex flex-1 w-full flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#66756f]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <input
              type="text"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por descripcion..."
              className="field pl-11"
            />
          </div>
          <select
            value={filtroCategoria}
            onChange={(event) => setFiltroCategoria(event.target.value)}
            className="field w-full md:w-64"
          >
            <option value="">Todas las categorias</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
            ))}
          </select>
          <select
            value={filtroEtiqueta}
            onChange={(event) => setFiltroEtiqueta(event.target.value)}
            className="field w-full md:w-64"
          >
            <option value="">Todas las etiquetas</option>
            {etiquetas.map((etiqueta) => (
              <option key={etiqueta.id} value={etiqueta.id}>{etiqueta.nombre}</option>
            ))}
          </select>
          <input
            type="date"
            value={fechaDesde}
            onChange={(event) => setFechaDesde(event.target.value)}
            className="field w-full md:w-48"
            aria-label="Fecha desde"
          />
          <input
            type="date"
            value={fechaHasta}
            onChange={(event) => setFechaHasta(event.target.value)}
            className="field w-full md:w-48"
            aria-label="Fecha hasta"
          />
          <select
            value={orden}
            onChange={(event) => setOrden(event.target.value)}
            className="field w-full md:w-52"
          >
            <option value="recientes">Mas recientes</option>
            <option value="antiguos">Mas antiguos</option>
            <option value="monto-desc">Mayor monto</option>
            <option value="monto-asc">Menor monto</option>
          </select>
        </div>
        <button type="button" onClick={descargarFiltrados} className="secondary-button w-full shrink-0 lg:w-auto">
          Exportar vista
        </button>
        <button type="button" onClick={imprimirReporte} className="secondary-button w-full shrink-0 lg:w-auto">
          Imprimir reporte
        </button>
        <button type="button" onClick={guardarVistaActual} className="secondary-button w-full shrink-0 lg:w-auto">
          Guardar vista
        </button>
      </div>

      <div className="print:hidden flex flex-wrap gap-2">
        {[
          ["hoy", "Hoy"],
          ["semana", "Semana"],
          ["mes", "Mes"],
          ["30", "30 dias"],
          ["todo", "Todo"],
        ].map(([tipo, label]) => (
          <button
            key={tipo}
            type="button"
            onClick={() => aplicarRangoRapido(tipo)}
            className="secondary-button text-sm"
          >
            {label}
          </button>
        ))}
      </div>

      {savedFilters.length > 0 && (
        <div className="print:hidden flex flex-wrap gap-2">
          {savedFilters.map((vista, index) => (
            <button
              key={`${vista.nombre}-${index}`}
              type="button"
              onClick={() => aplicarVistaGuardada(vista)}
              className="secondary-button text-sm"
            >
              {vista.nombre}
            </button>
          ))}
        </div>
      )}

      {filtrosActivos.length > 0 && (
        <div className="print:hidden flex flex-wrap items-center gap-2">
          {filtrosActivos.map((filtro) => (
            <span key={filtro} className="rounded-full border border-[#d8e3dc] bg-[#fbfdfb] px-3 py-1 text-xs font-black text-[#66756f]">
              {filtro}
            </span>
          ))}
          <button type="button" onClick={limpiarFiltros} className="secondary-button text-sm">
            Limpiar filtros
          </button>
        </div>
      )}

      {loading && <LoadingState lines={6} />}

      <div className="grid gap-3 md:hidden">
        {!loading && gastosPaginados.map((gasto) => (
          <div key={gasto.id} className={`panel rounded-[24px] ${compactPadding}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-black text-[#17201c]">{gasto.descripcion}</h3>
                <p className="mt-1 text-sm font-bold text-[#66756f]">{formatDate(gasto.fecha_hora)}</p>
              </div>
              <span className="shrink-0 text-lg font-black text-[#206a5d]">{money(gasto.monto, preferences)}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[#66756f]">
              <span className="rounded-full bg-[#edf5ef] px-3 py-1">{gasto.metodo_pago_nombre || "Sin metodo"}</span>
              <span className="rounded-full bg-[#fff7e5] px-3 py-1">{gasto.categoria_nombre || "Sin categoria"}</span>
              {(gasto.etiquetas || []).slice(0, 2).map((etiqueta) => (
                <span key={etiqueta.id} className="rounded-full bg-white px-3 py-1">{etiqueta.nombre}</span>
              ))}
            </div>
            {gasto.nota && (
              <p className="mt-4 rounded-2xl bg-[#fbfdfb] p-3 text-sm font-semibold text-[#66756f]">{gasto.nota}</p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate("/agregar-gasto", { state: { gastoParaEditar: gasto } })}
                className="secondary-button w-full"
              >
                Editar
              </button>
              <button
                onClick={() => duplicarGasto(gasto)}
                className="secondary-button w-full"
              >
                Duplicar
              </button>
            </div>
          </div>
        ))}
        {gastosOrdenados.length === 0 && (
          <div className="panel rounded-[24px] p-8 text-center text-sm font-semibold text-[#66756f]">
            No se encontraron registros.
          </div>
        )}
      </div>

      {!loading && (
      <div className="panel mb-6 hidden overflow-hidden rounded-[24px] md:block">
        <div className="border-b border-[#edf3ef] bg-white/70 p-6">
          <h3 className="text-xl font-black text-[#17201c]">Historial de Movimientos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#edf3ef] bg-[#f6faf7] text-sm font-black uppercase tracking-wide text-[#66756f]">
                <th className="p-4 pl-6">Descripcion</th>
                <th className="p-4">Monto</th>
                <th className="p-4">Metodo</th>
                <th className="p-4">Etiquetas</th>
                <th className="p-4">Fecha y Hora</th>
                <th className="p-4 text-center pr-6">Accion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf3ef] bg-white/65">
              {gastosPaginados.map((gasto) => (
                <tr key={gasto.id} className="transition-colors hover:bg-[#f8fbf8]">
                  <td className="p-4 pl-6 font-bold text-[#2b3b35]">
                    <span>{gasto.descripcion}</span>
                    {gasto.nota && <span className="mt-1 block max-w-xs truncate text-xs font-semibold text-[#9a6a16]">{gasto.nota}</span>}
                  </td>
                  <td className="p-4 font-black text-[#17201c]">{money(gasto.monto, preferences)}</td>
                  <td className="p-4 text-sm font-semibold text-[#66756f]">{gasto.metodo_pago_nombre || "Sin metodo"}</td>
                  <td className="p-4 text-sm font-semibold text-[#66756f]">{(gasto.etiquetas || []).map((etiqueta) => etiqueta.nombre).join(", ") || "-"}</td>
                  <td className="p-4 text-sm font-semibold text-[#66756f]">{formatDateTime(gasto.fecha_hora)}</td>
                  <td className="p-4 text-center pr-6">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => navigate("/agregar-gasto", { state: { gastoParaEditar: gasto } })}
                        className="secondary-button text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => duplicarGasto(gasto)}
                        className="secondary-button text-sm"
                      >
                        Duplicar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {gastosOrdenados.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-[#66756f]">
                    <p className="text-lg font-black">No se encontraron registros.</p>
                    <p className="mt-1 text-sm">Intenta con otros filtros de busqueda.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {!loading && (
      <div className="print:hidden mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-bold text-[#66756f]">
          Pagina {currentPage} de {totalPages} - {gastosOrdenados.length} movimientos
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            className="secondary-button disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
            className="secondary-button disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
