import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { setToken } from "./api";

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/equipo_01/api" : "http://localhost:5000/api");

export default function AuthForm({ mode }) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/${isRegister ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          email: email.trim(),
          password,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo completar la solicitud.");
      }

      setToken(data.token);
      navigate("/inicio", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell flex min-h-screen items-center justify-center p-5">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/80 bg-white/70 shadow-2xl shadow-emerald-950/10 backdrop-blur-xl md:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden bg-[#206a5d] p-10 text-white md:flex md:flex-col md:justify-between">
          <div>
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 text-2xl font-black">$</div>
            <h1 className="mt-8 text-4xl font-black leading-tight">Administra tu dinero con calma.</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/78">
              Registra movimientos, revisa tus gastos del mes y mantén tus categorias ordenadas en un espacio limpio.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl bg-white/12 p-4">
              <span className="block text-2xl font-black">01</span>
              <span className="text-white/75">Captura</span>
            </div>
            <div className="rounded-2xl bg-white/12 p-4">
              <span className="block text-2xl font-black">02</span>
              <span className="text-white/75">Organiza</span>
            </div>
            <div className="rounded-2xl bg-white/12 p-4">
              <span className="block text-2xl font-black">03</span>
              <span className="text-white/75">Decide</span>
            </div>
          </div>
        </section>

        <section className="p-7 sm:p-10">
          <div className="mb-8">
            <span className="rounded-full bg-[#edf5ef] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#206a5d]">
              {isRegister ? "Nueva cuenta" : "Bienvenido"}
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-[#17201c]">
              {isRegister ? "Crear cuenta" : "Iniciar sesion"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#66756f]">
              {isRegister ? "Registra tu usuario para guardar tus movimientos." : "Entra para administrar tus gastos."}
            </p>
          </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {isRegister && (
            <div>
              <label className="field-label">Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                className="field"
                required
              />
            </div>
          )}

          <div>
            <label className="field-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field"
              required
            />
          </div>

          <div>
            <label className="field-label">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="field pr-12"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10 10 0 0 1 6.06 6.06" />
                    <path d="M1 1l22 22" />
                    <path d="M10.58 10.58a3 3 0 1 0 4.24 4.24" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="primary-button w-full disabled:opacity-60"
          >
            {loading ? "Procesando..." : isRegister ? "Registrarme" : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#66756f]">
          {isRegister ? "Ya tienes cuenta? " : "No tienes cuenta? "}
          <Link className="font-black text-[#206a5d] hover:text-[#174c43]" to={isRegister ? "/login" : "/register"}>
            {isRegister ? "Inicia sesion" : "Registrate"}
          </Link>
        </p>
        </section>
      </div>
    </div>
  );
}
