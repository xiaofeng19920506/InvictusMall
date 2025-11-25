import { useState, useMemo, useEffect } from "react";
import AdminLayout from "../shared/components/AdminLayout";
import { useAuth } from "../contexts/AuthContext";
import { authService } from "../services/auth";
import {
  LazyDashboard,
  LazyStoresManagement,
  LazyUsersManagement,
  LazySystemLogs,
  LazySettings,
  LazyProductsManagement,
  LazyCategoriesManagement,
  LazyInventoryManagement,
  LazyOrdersManagement,
} from "./routes";
import type { AdminPageKey } from "./types";

const AdminApp = () => {
  const [currentPage, setCurrentPage] = useState<AdminPageKey>("dashboard");
  const { user } = useAuth();

  // Redirect non-admin users away from categories page
  // Redirect non-authenticated or unauthorized users away from protected pages
  useEffect(() => {
    if (!user) return;
    
    if (currentPage === "categories" && user.role !== "admin") {
      setCurrentPage("dashboard");
    }
    
    // Check inventory page access - requires stores permission
    if (currentPage === "inventory" && !authService.hasPermission(user, "stores")) {
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
      case "inventory":
        // Only allow access if user has stores permission
        if (user && authService.hasPermission(user, "stores")) {
          return <LazyInventoryManagement />;
        }
        return <LazyDashboard onNavigate={setCurrentPage} />;
      default:
        return <LazyDashboard onNavigate={setCurrentPage} />;
    }
  }, [currentPage, user]);

  return (
    <AdminLayout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage}
    </AdminLayout>
  );
};

export default AdminApp;

