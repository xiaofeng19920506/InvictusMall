import { useState, useMemo, useEffect } from "react";
import { Provider } from "react-redux";
import { store } from "../store";
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
    
    // Check users page access - only admin, owner, or manager can access
    if (currentPage === "users" && user.role === "employee") {
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
        // Only allow admin, owner, or manager access
        if (user && (user.role === "admin" || user.role === "owner" || user.role === "manager")) {
          return <LazyUsersManagement />;
        }
        return <LazyDashboard onNavigate={setCurrentPage} />;
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
    <Provider store={store}>
      <AdminLayout currentPage={currentPage} onPageChange={setCurrentPage}>
        {renderPage}
      </AdminLayout>
    </Provider>
  );
};

export default AdminApp;

