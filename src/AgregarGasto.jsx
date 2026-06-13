import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "./api";
import { Toast } from "./Feedback";

// Formatea número a string con separador de miles y decimales
// Ej: 1500.5 → "1,500.5" | "100000" → "100,000"
function formatMonto(raw) {
  if (raw === "" || raw === null || raw === undefined) return "";
  const str = String(raw);
  const hasDot = str.includes(".");
  const [intPart, decPart] = str.split(".");
  const intNum = parseInt(intPart || "0", 10);
  if (isNaN(intNum)) return "";
  const formattedInt = intNum.toLocaleString("es-MX");
  return hasDot ? `${formattedInt}.${decPart ?? ""}` : formattedInt;
}

// Convierte valor formateado a número puro para la BD (quita comas)
// Ej: "1,500.50" → 1500.50
function rawMonto(formatted) {
  return parseFloat(String(formatted || "").replace(/,/g, "")) || 0;
}

export default function AgregarGasto({ gastoParaEditar, onGastoGuardado }) {
  const location = useLocation();
  const navigate = useNavigate();
  const gastoDesdeEstado = location.state && location.state.gastoParaEditar;
  const prefill = (location.state && location.state.prefill) || {};
  const gastoEdicion = gastoParaEditar || gastoDesdeEstado;
  const [monto, setMonto] = useState(() => formatMonto(gastoEdicion?.monto || prefill.monto || ""));
  const [descripcion, setDescripcion] = useState(gastoEdicion?.descripcion || prefill.descripcion || "");
  const [categoriaId, setCategoriaId] = useState(gastoEdicion?.categoria_id || prefill.categoria_id || "");
  const [fechaHora, setFechaHora] = useState(gastoEdicion?.fecha_hora || "");
  const [metodoPagoId, setMetodoPagoId] = useState(gastoEdicion?.metodo_pago_id || prefill.metodo_pago_id || "");
  const [nota, setNota] = useState(gastoEdicion?.nota || prefill.nota || "");
  const [esRecurrente, setEsRecurrente] = useState(Boolean(gastoEdicion?.es_recurrente));
  const [frecuencia, setFrecuencia] = useState(gastoEdicion?.frecuencia || "mensual");
  const [etiquetasSeleccionadas, setEtiquetasSeleccionadas] = useState(
    (gastoEdicion?.etiquetas || prefill.etiquetas || []).map((etiqueta) => String(etiqueta.id || etiqueta))
  );
  const [categorias, setCategorias] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [etiquetas, setEtiquetas] = useState([]);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonthStr = String(currentDate.getMonth() + 1).padStart(2, "0");
  const lastDayOfMonth = new Date(currentYear, currentDate.getMonth() + 1, 0).getDate();

  const minDateTime = `${currentYear}-${currentMonthStr}-01T00:00`;
  const maxDateTime = `${currentYear}-${currentMonthStr}-${lastDayOfMonth}T23:59`;

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4200);
  };

  useEffect(() => {
    apiFetch("/categorias")
      .then((res) => res.json())
      .then((data) => setCategorias(data))
      .catch((err) => console.error("Error al cargar categorias:", err));

    apiFetch("/metodos_pago")
      .then((res) => res.json())
      .then((data) => setMetodosPago(data))
      .catch((err) => console.error("Error al cargar metodos de pago:", err));

    apiFetch("/etiquetas")
      .then((res) => res.json())
      .then((data) => setEtiquetas(data))
      .catch((err) => console.error("Error al cargar etiquetas:", err));
  }, []);

  useEffect(() => {
    if (!gastoEdicion && prefill.descripcion) {
      setDescripcion(prefill.descripcion);
    }
    if (!gastoEdicion && prefill.monto) {
      setMonto(formatMonto(prefill.monto));
    }
    if (!gastoEdicion && prefill.categoria_id) {
      setCategoriaId(prefill.categoria_id);
    }
    if (!gastoEdicion && prefill.metodo_pago_id) {
      setMetodoPagoId(prefill.metodo_pago_id);
    }
    if (!gastoEdicion && prefill.nota) {
      setNota(prefill.nota);
    }
    if (!gastoEdicion && prefill.etiquetas) {
      setEtiquetasSeleccionadas(prefill.etiquetas.map((etiqueta) => String(etiqueta.id || etiqueta)));
    }
  }, [gastoEdicion, prefill.descripcion, prefill.monto, prefill.categoria_id, prefill.metodo_pago_id, prefill.nota, prefill.etiquetas]);

  const toggleEtiqueta = (id) => {
    setEtiquetasSeleccionadas((actuales) =>
      actuales.includes(String(id))
        ? actuales.filter((etiquetaId) => etiquetaId !== String(id))
        : [...actuales, String(id)]
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!monto || rawMonto(monto) <= 0) {
      nextErrors.monto = "Ingresa un monto mayor a cero.";
    } else if (rawMonto(monto) > 100000.00) {
      nextErrors.monto = "El monto no puede superar $100,000.00.";
    }

    if (!descripcion.trim()) {
      nextErrors.descripcion = "Agrega una descripcion corta.";
    } else if (descripcion.trim().length > 100) {
      nextErrors.descripcion = "La descripcion no puede superar los 100 caracteres.";
    }

    if (!categoriaId) nextErrors.categoria = "Selecciona una categoria.";

    if (!fechaHora) {
      nextErrors.fecha = "Selecciona fecha y hora.";
    } else {
      const selectedDate = new Date(fechaHora);
      if (
        selectedDate.getFullYear() !== currentYear ||
        selectedDate.getMonth() !== currentDate.getMonth()
      ) {
        nextErrors.fecha = "Solo se permiten fechas del mes y año actual.";
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      showToast("Revisa los campos marcados.", "warning");
      return;
    }

    const url = gastoEdicion ? `/gastos/${gastoEdicion.id}` : "/gastos";
    const method = gastoEdicion ? "PUT" : "POST";
    const datosGasto = {
      monto: rawMonto(monto),
      descripcion,
      categoria_id: parseInt(categoriaId),
      metodo_pago_id: metodoPagoId ? parseInt(metodoPagoId) : null,
      fecha_hora: fechaHora,
      nota,
      es_recurrente: esRecurrente,
      frecuencia: esRecurrente ? frecuencia : null,
      etiquetas: etiquetasSeleccionadas.map((id) => parseInt(id)),
    };

    try {
      const response = await apiFetch(url, {
        method,
        body: JSON.stringify(datosGasto),
      });
      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || "No se pudo guardar el gasto.", "error");
        return;
      }

      if (data.aviso_presupuesto) {
        showToast(
          `Guardado, pero superaste el presupuesto: $${Number(data.total_mes_categoria).toFixed(2)} / $${Number(data.limite).toFixed(2)}`,
          "warning"
        );
      } else {
        showToast(gastoEdicion ? "Gasto actualizado con exito." : "Gasto registrado con exito.");
      }

      if (!gastoEdicion) {
        setMonto("");
        setDescripcion("");
        setCategoriaId("");
        setFechaHora("");
        setMetodoPagoId("");
        setNota("");
        setEsRecurrente(false);
        setFrecuencia("mensual");
        setEtiquetasSeleccionadas([]);
      }

      if (onGastoGuardado) onGastoGuardado();
      if (gastoEdicion) {
        window.setTimeout(() => navigate("/total-gastado"), 700);
      }
    } catch (error) {
      console.error("Error al procesar el gasto:", error);
      showToast("No se pudo conectar con la API.", "error");
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
      <div className="mb-6">
        <span className="rounded-full bg-[#edf5ef] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#206a5d]">
          Movimiento
        </span>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-[#17201c]">
          {gastoEdicion ? "Editar Gasto" : "Registrar Gasto"}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66756f]">
          {gastoEdicion ? "Modifica los detalles de tu registro." : "Ingresa los detalles de tu nuevo movimiento."}
        </p>
      </div>

      {gastoEdicion && (
        <div className="panel mb-5 flex flex-col gap-3 rounded-[20px] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-[#206a5d]">Editando movimiento</p>
            <p className="mt-1 text-sm font-semibold text-[#66756f]">{gastoEdicion.descripcion}</p>
          </div>
          <button type="button" onClick={() => navigate("/total-gastado")} className="secondary-button">
            Cancelar edicion
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="panel grid grid-cols-1 gap-6 rounded-[24px] p-5 sm:p-8 md:grid-cols-2">
        <div>
          <label className="field-label">Monto</label>
          <div className="relative">
            {monto && (
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-bold text-[#66756f]">$</span>
            )}
            <input
              type="text"
              inputMode="decimal"
              value={monto}
              onChange={(event) => {
                const inputValue = event.target.value;
                // Quitar comas para obtener el valor numérico puro
                const raw = inputValue.replace(/,/g, "");
                if (raw === "") { setMonto(""); return; }
                // Solo permitir dígitos con punto decimal y máximo 2 decimales
                if (!/^\d+(\.\d{0,2})?$/.test(raw)) return;
                // Bloquear si excede $100,000.00
                if (parseFloat(raw) > 100000) return;
                // Guardar con formato (comas de miles)
                setMonto(formatMonto(raw));
              }}
              className={`field ${monto ? "!pl-9" : "!pl-4"}`}
              placeholder="$2,000.00"
              required
            />
          </div>
          {errors.monto && <p className="mt-2 text-sm font-bold text-red-600">{errors.monto}</p>}
        </div>

        <div>
          <label className="field-label">Fecha y hora</label>
          <input
            type="datetime-local"
            value={fechaHora}
            onChange={(event) => setFechaHora(event.target.value)}
            className="field"
            min={minDateTime}
            max={maxDateTime}
            required
          />
          {errors.fecha && <p className="mt-2 text-sm font-bold text-red-600">{errors.fecha}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="field-label">Descripcion</label>
          <input
            type="text"
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            className="field"
            placeholder="Ej. Compra de supermercado"
            maxLength={100}
            required
          />
          {errors.descripcion && <p className="mt-2 text-sm font-bold text-red-600">{errors.descripcion}</p>}
        </div>

        <div>
          <label className="field-label">Categoria</label>
          <select
            value={categoriaId}
            onChange={(event) => setCategoriaId(event.target.value)}
            className="field"
            required
          >
            <option value="">Selecciona una categoria</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
            ))}
          </select>
          {errors.categoria && <p className="mt-2 text-sm font-bold text-red-600">{errors.categoria}</p>}
        </div>

        <div>
          <label className="field-label">Metodo de pago</label>
          <select
            value={metodoPagoId}
            onChange={(event) => setMetodoPagoId(event.target.value)}
            className="field"
          >
            <option value="">Sin metodo asignado</option>
            {metodosPago.map((metodo) => (
              <option key={metodo.id} value={metodo.id}>{metodo.nombre}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="field-label">Nota</label>
          <textarea
            value={nota}
            onChange={(event) => setNota(event.target.value)}
            className="field min-h-24 resize-y"
            placeholder="Detalle adicional del movimiento"
            maxLength={100}
          />
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-[#d8e3dc] bg-[#fbfdfb] p-4">
          <input
            id="es_recurrente"
            type="checkbox"
            checked={esRecurrente}
            onChange={(event) => setEsRecurrente(event.target.checked)}
            className="h-4 w-4 accent-[#206a5d]"
          />
          <label htmlFor="es_recurrente" className="text-sm font-bold text-[#2b3b35]">Gasto recurrente</label>
        </div>

        {esRecurrente && (
          <div>
            <label className="field-label">Frecuencia</label>
            <select
              value={frecuencia}
              onChange={(event) => setFrecuencia(event.target.value)}
              className="field"
            >
              <option value="diario">Diario</option>
              <option value="semanal">Semanal</option>
              <option value="mensual">Mensual</option>
              <option value="anual">Anual</option>
            </select>
          </div>
        )}

        <div className="md:col-span-2">
          <label className="field-label">Etiquetas</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {etiquetas.map((etiqueta) => (
              <label key={etiqueta.id} className="flex items-center gap-2 rounded-2xl border border-[#d8e3dc] bg-[#fbfdfb] p-3 text-sm font-semibold text-[#51635b]">
                <input
                  type="checkbox"
                  checked={etiquetasSeleccionadas.includes(String(etiqueta.id))}
                  onChange={() => toggleEtiqueta(etiqueta.id)}
                  className="h-4 w-4 accent-[#206a5d]"
                />
                {etiqueta.nombre}
              </label>
            ))}
            {etiquetas.length === 0 && (
              <p className="text-sm text-[#66756f]">No hay etiquetas disponibles.</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="primary-button mt-2 w-full md:col-span-2"
        >
          {gastoEdicion ? "Guardar Cambios" : "Agregar Movimiento"}
        </button>
      </form>
    </div>
  );
}
