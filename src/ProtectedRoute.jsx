import { Navigate } from "react-router-dom";
import { isAuthenticated } from "./api";

export default function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate replace to="/login" />;
  }

  return children;
}
