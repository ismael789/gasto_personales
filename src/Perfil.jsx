import { useEffect, useState } from "react";
import { apiFetch, clearToken } from "./api";
import { Toast } from "./Feedback";
import { DEFAULT_PREFERENCES, loadPreferences, savePreferences } from "./preferences";

export default function Perfil() {
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState(loadPreferences);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3600);
  };

  useEffect(() => {
    apiFetch("/auth/me")
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch((err) => console.error("Error al cargar usuario:", err));
  }, []);

  const updatePreference = (key, value) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    savePreferences(next);
    showToast("Preferencia guardada.");
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
    savePreferences(DEFAULT_PREFERENCES);
    showToast("Preferencias restauradas.");
  };

  const closeSession = () => {
    clearToken();
    window.location.href = "/equipo_01/login";
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />

      <section className="overflow-hidden rounded-[28px] bg-[#206a5d] p-7 text-white shadow-2xl shadow-emerald-950/10 sm:p-8">
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-white/90">
          Perfil
        </span>
        <h1 className="mt-4 text-4xl font-black tracking-tight">{user?.nombre || "Tu cuenta"}</h1>
        <p className="mt-2 text-sm font-semibold text-white/78">{user?.email || "Cargando informacion..."}</p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="panel rounded-[24px] p-6">
          <h2 className="text-xl font-black text-[#17201c]">Cuenta</h2>
          <div className="mt-5 space-y-4 text-sm font-semibold text-[#66756f]">
            <p><span className="font-black text-[#2b3b35]">Nombre:</span> {user?.nombre || "-"}</p>
            <p><span className="font-black text-[#2b3b35]">Email:</span> {user?.email || "-"}</p>
          </div>
          <button type="button" onClick={closeSession} className="danger-button mt-6 w-full">
            Cerrar sesion
          </button>
        </div>

        <div className="panel rounded-[24px] p-6">
          <h2 className="text-xl font-black text-[#17201c]">Configuracion visual</h2>
          <p className="mt-1 text-sm font-semibold text-[#66756f]">Estas preferencias se guardan solo en este navegador.</p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="field-label">Moneda visual</label>
              <select
                value={preferences.currency}
                onChange={(event) => updatePreference("currency", event.target.value)}
                className="field"
              >
                <option value="$">$ Peso</option>
                <option value="MX$">MX$ Peso mexicano</option>
                <option value="USD ">USD</option>
                <option value="">Sin simbolo</option>
              </select>
            </div>

            <div>
              <label className="field-label">Movimientos por pagina</label>
              <select
                value={preferences.pageSize}
                onChange={(event) => updatePreference("pageSize", Number(event.target.value))}
                className="field"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="field-label">Densidad de vista</label>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => updatePreference("density", "comfortable")}
                  className={`secondary-button ${preferences.density === "comfortable" ? "border-[#206a5d] text-[#206a5d]" : ""}`}
                >
                  Comoda
                </button>
                <button
                  type="button"
                  onClick={() => updatePreference("density", "compact")}
                  className={`secondary-button ${preferences.density === "compact" ? "border-[#206a5d] text-[#206a5d]" : ""}`}
                >
                  Compacta
                </button>
              </div>
            </div>
          </div>

          <button type="button" onClick={resetPreferences} className="secondary-button mt-6">
            Restaurar preferencias
          </button>
        </div>
      </section>
    </div>
  );
}
