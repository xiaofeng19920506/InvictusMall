import { useState } from "react";
import Dashboard from "./Dashboard";
import StoresManagement from "./StoresManagement";
import Analytics from "./Analytics";
import SystemLogs from "./SystemLogs";
import AdminRegister from "./AdminRegister";
import UsersManagement from "./UsersManagement";
import Settings from "./Settings";
import AdminLayout from "./AdminLayout";

export type AdminPageKey =
  | "dashboard"
  | "stores"
  | "users"
  | "analytics"
  | "register-staff"
  | "settings"
  | "system_logs";

const AdminApp = () => {
  const [currentPage, setCurrentPage] = useState<AdminPageKey>("dashboard");

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard onNavigate={setCurrentPage} />;
      case "stores":
        return <StoresManagement />;
      case "users":
        return <UsersManagement />;
      case "analytics":
        return <Analytics />;
      case "register-staff":
        return <AdminRegister />;
      case "system_logs":
        return <SystemLogs />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AdminLayout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </AdminLayout>
  );
};

export default AdminApp;

