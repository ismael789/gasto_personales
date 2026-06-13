import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearToken } from "./api";

const navItems = [
  { path: "/inicio", label: "Inicio" },
  { path: "/agregar-gasto", label: "Agregar" },
  { path: "/categoria", label: "Categorias" },
  { path: "/total-gastado", label: "Resumen" },
  { path: "/eliminar-registros", label: "Registros" },
  { path: "/perfil", label: "Perfil" },
];

export default function Breadcrumb() {
  const location = useLocation();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("gastos_theme") === "dark");
  const [globalSearch, setGlobalSearch] = useState("");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("gastos_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const linkClass = (path) => {
    const active = location.pathname === path || (path === "/inicio" && location.pathname === "/");

    return `rounded-full px-4 py-2 text-sm font-bold transition-all ${
      active
        ? "bg-[#206a5d] text-white shadow-sm"
        : "text-[#51635b] hover:bg-white hover:text-[#17201c]"
    }`;
  };

  return (
    <header className="sticky top-0 z-20 border-b border-white/70 bg-[#f8fbf8]/80 backdrop-blur-xl dark:border-[#244239] dark:bg-[#091411]/85">
      <div className="page-wrap flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
        <Link to="/inicio" className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#206a5d] text-lg font-black text-white shadow-lg shadow-emerald-900/10">
            $
          </span>
          <span>
            <span className="block text-lg font-black leading-tight text-[#17201c]">Mis gastos</span>
            <span className="block text-xs font-semibold text-[#66756f]">Control simple y tranquilo</span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-2 rounded-[28px] border border-[#dfe8e3] bg-[#edf5ef]/80 p-1">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path} className={linkClass(item.path)}>
              {item.label}
            </Link>
          ))}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              navigate("/total-gastado", { state: { busqueda: globalSearch } });
            }}
            className="relative"
          >
            <input
              type="search"
              value={globalSearch}
              onChange={(event) => setGlobalSearch(event.target.value)}
              placeholder="Buscar"
              className="h-9 w-32 rounded-full border border-transparent bg-white/80 px-3 text-sm font-semibold text-[#17201c] outline-none transition-all focus:w-44 focus:border-[#206a5d] dark:bg-[#13231f] dark:text-white"
              aria-label="Buscar gastos"
            />
          </form>
          <button
            type="button"
            onClick={() => setDarkMode((value) => !value)}
            className="grid h-9 w-9 place-items-center rounded-full text-[#51635b] transition-colors hover:bg-white hover:text-[#17201c] dark:text-[#a8b8b0] dark:hover:bg-[#13231f] dark:hover:text-white"
            aria-label={darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            title={darkMode ? "Modo claro" : "Modo oscuro"}
          >
            {darkMode ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3a6.8 6.8 0 0 0 8.6 8.6 8 8 0 1 1-8.6-8.6Z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              clearToken();
              navigate("/login", { replace: true });
            }}
            className="rounded-full px-4 py-2 text-sm font-bold text-[#b95050] transition-colors hover:bg-white"
          >
            Salir
          </button>
        </nav>
      </div>
    </header>
  );
}
