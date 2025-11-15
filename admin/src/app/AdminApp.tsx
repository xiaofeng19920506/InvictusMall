import { useState, useMemo } from "react";
import AdminLayout from "../shared/components/AdminLayout";
import {
  LazyDashboard,
  LazyStoresManagement,
  LazyUsersManagement,
  LazyAnalytics,
  LazyAdminRegister,
  LazySystemLogs,
  LazySettings,
  LazyTransactionsManagement,
} from "./routes";
import type { AdminPageKey } from "./types";

const AdminApp = () => {
  const [currentPage, setCurrentPage] = useState<AdminPageKey>("dashboard");

  // Memoized page renderer to avoid unnecessary re-renders
  const renderPage = useMemo(() => {
    switch (currentPage) {
      case "dashboard":
        return <LazyDashboard onNavigate={setCurrentPage} />;
      case "stores":
        return <LazyStoresManagement />;
      case "users":
        return <LazyUsersManagement />;
      case "analytics":
        return <LazyAnalytics />;
      case "register-staff":
        return <LazyAdminRegister />;
      case "system_logs":
        return <LazySystemLogs />;
      case "settings":
        return <LazySettings />;
      case "transactions":
        return <LazyTransactionsManagement />;
      default:
        return <LazyDashboard onNavigate={setCurrentPage} />;
    }
  }, [currentPage]);

  return (
    <AdminLayout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage}
    </AdminLayout>
  );
};

export default AdminApp;

