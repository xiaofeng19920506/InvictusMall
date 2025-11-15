import { lazy, Suspense } from "react";
import type { ComponentType } from "react";

// Lazy load all page components for better performance
const Dashboard = lazy(() => import("../features/dashboard/Dashboard"));
const StoresManagement = lazy(() => import("../features/stores/StoresManagement"));
const UsersManagement = lazy(() => import("../features/users/UsersManagement"));
const Analytics = lazy(() => import("../features/analytics/Analytics"));
const AdminRegister = lazy(() => import("../features/auth/AdminRegister"));
const SystemLogs = lazy(() => import("../features/system-logs/SystemLogs"));
const Settings = lazy(() => import("../features/settings/Settings"));
const TransactionsManagement = lazy(() => import("../features/transactions/TransactionsManagement"));
const ProductsManagement = lazy(() => import("../features/products/ProductsManagement"));
const CategoriesManagement = lazy(() => import("../features/categories/CategoriesManagement"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

// Wrapper component for Suspense
const withSuspense = (Component: ComponentType<any>) => (props: any) => (
  <Suspense fallback={<PageLoader />}>
    <Component {...props} />
  </Suspense>
);

// Export lazy-loaded components with Suspense
export const LazyDashboard = withSuspense(Dashboard);
export const LazyStoresManagement = withSuspense(StoresManagement);
export const LazyUsersManagement = withSuspense(UsersManagement);
export const LazyAnalytics = withSuspense(Analytics);
export const LazyAdminRegister = withSuspense(AdminRegister);
export const LazySystemLogs = withSuspense(SystemLogs);
export const LazySettings = withSuspense(Settings);
export const LazyTransactionsManagement = withSuspense(TransactionsManagement);
export const LazyProductsManagement = withSuspense(ProductsManagement);
export const LazyCategoriesManagement = withSuspense(CategoriesManagement);

