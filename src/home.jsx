import { Outlet } from "react-router-dom";
import Breadcrumb from "./bread";

export default function Home() {
  return (
    <div className="app-shell">
      <Breadcrumb />
      <main className="page-wrap py-8 md:py-10">
        <Outlet />
      </main>
    </div>
  );
}
