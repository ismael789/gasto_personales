import { useEffect, useState } from "react";
import { apiFetch } from "./api";
import { ConfirmDialog, Toast } from "./Feedback";
import LoadingState from "./LoadingState";

function csvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
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

export default function EliminarRegistros() {
  const [gastos, setGastos] = useState([]);
  const [gastoPendiente, setGastoPendiente] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4200);
  };

  const cargarGastos = () => {
    apiFetch("/gastos")
      .then((res) => res.json())
      .then((data) => setGastos(data))
      .catch((err) => console.error("Error al cargar movimientos:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargarGastos();
  }, []);

  const confirmarEliminar = async () => {
    if (!gastoPendiente) return;

    try {
      const response = await apiFetch(`/gastos/${gastoPendiente.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        showToast("Registro eliminado correctamente.");
        cargarGastos();
      } else {
        showToast("Hubo un problema al intentar eliminar el registro.", "error");
      }
    } catch (error) {
      console.error("Error al eliminar gasto:", error);
      showToast("No se pudo conectar con la API.", "error");
    } finally {
      setGastoPendiente(null);
    }
  };

  const descargarCsv = () => {
    const encabezados = ["descripcion", "monto", "metodo_pago", "etiquetas", "nota", "fecha_hora"];
    const filas = gastos.map((gasto) => [
      gasto.descripcion,
      gasto.monto,
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
    link.download = "gastos.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
      <ConfirmDialog
        open={Boolean(gastoPendiente)}
        title="Eliminar registro"
        message={`Esta accion eliminara "${gastoPendiente?.descripcion || "este gasto"}" de forma permanente.`}
        confirmText="Eliminar"
        onConfirm={confirmarEliminar}
        onCancel={() => setGastoPendiente(null)}
      />
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-[#b95050]">
            Mantenimiento
          </span>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#17201c]">Gestion de Registros</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66756f]">Desde aqui puedes purgar registros duplicados o incorrectos del sistema de forma permanente.</p>
        </div>
        <button
          type="button"
          onClick={descargarCsv}
          className="primary-button"
        >
          Descargar CSV
        </button>
      </div>

      {loading ? (
        <LoadingState lines={5} />
      ) : (
      <>
      <div className="grid gap-3 md:hidden">
        {gastos.map((gasto) => (
          <div key={gasto.id} className="panel rounded-[24px] p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-black text-[#17201c]">{gasto.descripcion}</h3>
                <p className="mt-1 text-sm font-bold text-[#66756f]">{formatDateTime(gasto.fecha_hora)}</p>
              </div>
              <span className="shrink-0 text-lg font-black text-[#206a5d]">${Number(gasto.monto).toFixed(2)}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[#66756f]">
              <span className="rounded-full bg-[#edf5ef] px-3 py-1">{gasto.metodo_pago_nombre || "Sin metodo"}</span>
              <span className="rounded-full bg-[#fff7e5] px-3 py-1">{(gasto.etiquetas || []).map((etiqueta) => etiqueta.nombre).join(", ") || "Sin etiquetas"}</span>
            </div>
            {gasto.nota && (
              <p className="mt-4 rounded-2xl bg-[#fbfdfb] p-3 text-sm font-semibold text-[#66756f]">{gasto.nota}</p>
            )}
            <button
              onClick={() => setGastoPendiente(gasto)}
              className="danger-button mt-5 w-full"
            >
              Eliminar
            </button>
          </div>
        ))}
        {gastos.length === 0 && (
          <div className="panel rounded-[24px] p-8 text-center text-sm font-semibold text-[#66756f]">
            Sin movimientos que mostrar.
          </div>
        )}
      </div>

      <div className="panel mb-6 hidden overflow-hidden rounded-[24px] md:block">
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
              {gastos.map((gasto) => (
                <tr key={gasto.id} className="group transition-colors hover:bg-red-50/40">
                  <td className="p-4 pl-6 font-bold text-[#2b3b35]">{gasto.descripcion}</td>
                  <td className="p-4 font-black text-[#17201c]">${Number(gasto.monto).toFixed(2)}</td>
                  <td className="p-4 text-sm font-semibold text-[#66756f]">{gasto.metodo_pago_nombre || "Sin metodo"}</td>
                  <td className="p-4 text-sm font-semibold text-[#66756f]">{(gasto.etiquetas || []).map((etiqueta) => etiqueta.nombre).join(", ") || "-"}</td>
                  <td className="p-4 text-sm font-semibold text-[#66756f]">
                    <span>{formatDateTime(gasto.fecha_hora)}</span>
                    {gasto.nota && <span className="mt-1 block max-w-xs truncate text-xs text-[#9a6a16]">{gasto.nota}</span>}
                  </td>
                  <td className="p-4 text-center pr-6">
                    <button
                      onClick={() => setGastoPendiente(gasto)}
                      className="danger-button text-sm"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {gastos.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-[#66756f]">
                    <p className="text-lg font-black">Sin movimientos que mostrar.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
