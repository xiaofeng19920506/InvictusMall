import { useState, useMemo, useEffect } from "react";
import AdminLayout from "../shared/components/AdminLayout";
import { useAuth } from "../contexts/AuthContext";
import {
  LazyDashboard,
  LazyStoresManagement,
  LazyUsersManagement,
  LazySystemLogs,
  LazySettings,
  LazyTransactionsManagement,
  LazyProductsManagement,
  LazyCategoriesManagement,
  LazyOrdersManagement,
} from "./routes";
import type { AdminPageKey } from "./types";

const AdminApp = () => {
  const [currentPage, setCurrentPage] = useState<AdminPageKey>("dashboard");
  const { user } = useAuth();

  // Redirect non-admin users away from categories page
  useEffect(() => {
    if (currentPage === "categories" && user && user.role !== "admin") {
      setCurrentPage("dashboard");
    }
  }, [currentPage, user]);

  // Memoized page renderer to avoid unnecessary re-renders
  const renderPage = useMemo(() => {
    switch (currentPage) {
      case "dashboard":
        return <LazyDashboard onNavigate={setCurrentPage} />;
      case "stores":
        return <LazyStoresManagement />;
      case "products":
        return <LazyProductsManagement />;
      case "categories":
        // Only allow admin access
        if (user && user.role === "admin") {
          return <LazyCategoriesManagement />;
        }
        return <LazyDashboard onNavigate={setCurrentPage} />;
      case "orders":
        return <LazyOrdersManagement />;
      case "users":
        return <LazyUsersManagement />;
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

