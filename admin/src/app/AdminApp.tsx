<<<<<<< HEAD
import { useState, useMemo, useEffect } from "react";
=======
import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "../store";
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
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

<<<<<<< HEAD
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
=======
// Route path mapping
const ROUTE_PATHS: Record<AdminPageKey, string> = {
  dashboard: "/dashboard",
  stores: "/stores",
  products: "/products",
  categories: "/categories",
  orders: "/orders",
  users: "/users",
  settings: "/settings",
  system_logs: "/system-logs",
  inventory: "/inventory",
};

// Protected Route Component
const ProtectedRoute = ({
  children,
  requiredRole,
  requiredPermission,
}: {
  children: React.ReactNode;
  requiredRole?: string | string[];
  requiredPermission?: string;
}) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check role requirement
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(user.role)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Check permission requirement
  if (requiredPermission && !authService.hasPermission(user, requiredPermission as any)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AdminApp = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Get current page from route
  const getCurrentPageFromPath = (pathname: string): AdminPageKey => {
    const path = pathname.split("/")[1] || "dashboard";
    const pageKey = Object.entries(ROUTE_PATHS).find(
      ([_, routePath]) => routePath === `/${path}`
    )?.[0] as AdminPageKey;
    return pageKey || "dashboard";
  };

  const currentPage = getCurrentPageFromPath(location.pathname);

  // Redirect to dashboard if on root path
  useEffect(() => {
    if (location.pathname === "/" || location.pathname === "") {
      navigate("/dashboard", { replace: true });
    }
  }, [location.pathname, navigate]);

  // Handle unauthorized access
  useEffect(() => {
    if (!user) return;

    // Redirect non-admin users away from categories page (only admin can manage categories)
    if (currentPage === "categories" && user.role !== "admin") {
      navigate("/dashboard", { replace: true });
    }

    // Check inventory page access - requires stores permission
    if (currentPage === "inventory" && !authService.hasPermission(user, "stores")) {
      navigate("/dashboard", { replace: true });
    }

    // Check users page access - only admin, owner, or manager can access
    if (currentPage === "users" && user.role === "employee") {
      navigate("/dashboard", { replace: true });
    }
  }, [currentPage, user, navigate]);

  return (
    <Provider store={store}>
      <AdminLayout currentPage={currentPage}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredPermission="dashboard">
                <LazyDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stores"
            element={
              <ProtectedRoute requiredPermission="stores">
                <LazyStoresManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute requiredPermission="stores">
                <LazyProductsManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/categories"
            element={
              <ProtectedRoute requiredRole="admin">
                <LazyCategoriesManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute requiredPermission="stores">
                <LazyOrdersManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedRoute requiredPermission="stores">
                <LazyInventoryManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute requiredRole={["admin", "owner", "manager"]}>
                <LazyUsersManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/system-logs"
            element={
              <ProtectedRoute requiredPermission="system_logs">
                <LazySystemLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute requiredPermission="settings">
                <LazySettings />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AdminLayout>
    </Provider>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
  );
};

export default AdminApp;
<<<<<<< HEAD
=======
export { ROUTE_PATHS };
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009

