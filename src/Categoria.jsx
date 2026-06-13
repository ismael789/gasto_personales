import { useEffect, useState } from "react";
import { apiFetch } from "./api";
import { ConfirmDialog, Toast } from "./Feedback";
import LoadingState from "./LoadingState";

export default function Categoria() {
  const [categorias, setCategorias] = useState([]);
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [categoriaPendiente, setCategoriaPendiente] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4200);
  };

  const cargarCategorias = () => {
    apiFetch("/categorias")
      .then((res) => res.json())
      .then((data) => setCategorias(data))
      .catch((err) => console.error("Error al cargar categorias:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargarCategorias();
  }, []);

  const handleCrear = async (event) => {
    event.preventDefault();
    if (!nuevaCategoria.trim()) return;

    try {
      const response = await apiFetch("/categorias", {
        method: "POST",
        body: JSON.stringify({ nombre: nuevaCategoria.trim() }),
      });

      if (response.ok) {
        setNuevaCategoria("");
        cargarCategorias();
        showToast("Categoria agregada correctamente.");
      } else {
        const data = await response.json();
        showToast(data.error || "No se pudo agregar la categoria.", "error");
      }
    } catch (error) {
      console.error("Error al crear categoria:", error);
      showToast("No se pudo conectar con la API.", "error");
    }
  };

  const confirmarEliminar = async () => {
    if (!categoriaPendiente) return;

    try {
      const response = await apiFetch(`/categorias/${categoriaPendiente.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        cargarCategorias();
        showToast("Categoria eliminada correctamente.");
      } else {
        showToast("No se pudo eliminar la categoria.", "error");
      }
    } catch (error) {
      console.error("Error al eliminar categoria:", error);
      showToast("No se pudo conectar con la API.", "error");
    } finally {
      setCategoriaPendiente(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
      <ConfirmDialog
        open={Boolean(categoriaPendiente)}
        title="Eliminar categoria"
        message={`Quieres eliminar "${categoriaPendiente?.nombre || "esta categoria"}"?`}
        confirmText="Eliminar"
        onConfirm={confirmarEliminar}
        onCancel={() => setCategoriaPendiente(null)}
      />
      <div className="mb-6">
        <span className="rounded-full bg-[#fff7e5] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#9a6a16]">
          Organizacion
        </span>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-[#17201c]">Gestion de Categorias</h2>
        <p className="mt-2 text-sm leading-6 text-[#66756f]">Organiza tus gastos anadiendo o eliminando categorias.</p>
      </div>

      <form onSubmit={handleCrear} className="panel mb-6 flex flex-col gap-3 rounded-[24px] p-5 sm:flex-row sm:p-6">
        <input
          type="text"
          value={nuevaCategoria}
          onChange={(event) => setNuevaCategoria(event.target.value)}
          placeholder="Nueva categoria (ej. Transporte)"
          className="field flex-1"
          required
        />
        <button type="submit" className="primary-button whitespace-nowrap">
          Anadir
        </button>
      </form>

      {loading ? (
        <LoadingState lines={4} />
      ) : (
      <div className="panel overflow-hidden rounded-[24px]">
        <ul className="divide-y divide-[#edf3ef]">
          {categorias.map((cat) => (
            <li key={cat.id} className="flex items-center justify-between gap-4 bg-white/70 p-5 transition-colors hover:bg-[#f6faf7]">
              <span className="flex items-center gap-3 text-base font-bold text-[#2b3b35]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#d69e2e]" />
                {cat.nombre}
              </span>
              <button
                onClick={() => setCategoriaPendiente(cat)}
                className="danger-button"
              >
                Eliminar
              </button>
            </li>
          ))}
          {categorias.length === 0 && (
            <li className="p-8 text-center text-sm font-semibold text-[#66756f]">
              No hay categorias registradas.
            </li>
          )}
        </ul>
      </div>
      )}
    </div>
  );
}
