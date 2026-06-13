import "./App.css";
import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./Home";
import Dashboard from "./Dashboard";
import AgregarGasto from "./AgregarGasto";
import Categoria from "./Categoria";
import TotalGastado from "./TotalGastado";
import EliminarRegistros from "./EliminarRegistros";
import Perfil from "./Perfil";
import NotFound from "./NotFound";
import AuthForm from "./AuthForm";
import ProtectedRoute from "./ProtectedRoute";

export default function App() {
  useEffect(() => {
    document.documentElement.classList.toggle("dark", localStorage.getItem("gastos_theme") === "dark");
  }, []);

  return (
    <BrowserRouter basename="/equipo_01/">
      <Routes>
        <Route path="/login" element={<AuthForm mode="login" />} />
        <Route path="/register" element={<AuthForm mode="register" />} />
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="inicio" element={<Dashboard />} />
          <Route path="agregar-gasto" element={<AgregarGasto />} />
          <Route path="categoria" element={<Categoria />} />
          <Route path="total-gastado" element={<TotalGastado />} />
          <Route path="eliminar-registros" element={<EliminarRegistros />} />
          <Route path="perfil" element={<Perfil />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
