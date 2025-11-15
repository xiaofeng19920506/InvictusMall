import { useState, useMemo, useCallback, useEffect, type ReactNode } from "react";
import {
  Store,
  BarChart3,
  Settings,
  Users,
  Menu,
  X,
  LogOut,
  Shield,
  UserCheck,
  TrendingUp,
  FileText,
  CreditCard,
  Package,
  FolderTree,
  ShoppingBag,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { authService, type Permission } from "../../services/auth";
import type { AdminPageKey } from "../../app/types";
import styles from "./AdminLayout.module.css";

interface AdminLayoutProps {
  children: ReactNode;
  currentPage: AdminPageKey;
  onPageChange: (page: AdminPageKey) => void;
}

type NavigationItem = {
  id: AdminPageKey;
  permission: Permission;
  icon: typeof BarChart3;
  translationKey: string;
  pageTitleKey: string;
};

const NAV_ITEMS: NavigationItem[] = [
  {
    id: "dashboard",
    permission: "dashboard",
    icon: BarChart3,
    translationKey: "nav.dashboard",
    pageTitleKey: "pages.dashboard",
  },
  {
    id: "stores",
    permission: "stores",
    icon: Store,
    translationKey: "nav.stores",
    pageTitleKey: "pages.stores",
  },
  {
    id: "products",
    permission: "stores",
    icon: Package,
    translationKey: "nav.products",
    pageTitleKey: "pages.products",
  },
  {
    id: "categories",
    permission: "stores",
    icon: FolderTree,
    translationKey: "nav.categories",
    pageTitleKey: "pages.categories",
  },
  {
    id: "orders",
    permission: "stores",
    icon: ShoppingBag,
    translationKey: "nav.orders",
    pageTitleKey: "pages.orders",
  },
  {
    id: "users",
    permission: "users",
    icon: Users,
    translationKey: "nav.users",
    pageTitleKey: "pages.users",
  },
  {
    id: "transactions",
    permission: "stores",
    icon: CreditCard,
    translationKey: "nav.transactions",
    pageTitleKey: "pages.transactions",
  },
  {
    id: "system_logs",
    permission: "system_logs",
    icon: FileText,
    translationKey: "nav.systemLogs",
    pageTitleKey: "pages.systemLogs",
  },
  {
    id: "settings",
    permission: "settings",
    icon: Settings,
    translationKey: "nav.settings",
    pageTitleKey: "pages.settings",
  },
];

const AdminLayout = ({
  children,
  currentPage,
  onPageChange,
}: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [headerActions, setHeaderActionsState] = useState<ReactNode>(null);
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  // Provide setHeaderActions function via context-like pattern
  // We'll use a ref to share state between this component and pages
  useEffect(() => {
    // Store setter in window temporarily for pages to access
    // This is a simple approach, but we could also use React Context
    (window as any).__setAdminHeaderActions = setHeaderActionsState;
    return () => {
      delete (window as any).__setAdminHeaderActions;
    };
  }, []);

  // Memoized navigation items based on user permissions
  const navigationItems = useMemo(() => {
    return user
      ? NAV_ITEMS.filter((item) => {
          // Hide register-staff for employee role
          if (item.id === "register-staff" && user.role === "employee") {
            return false;
          }
          // Hide categories for non-admin roles
          if (item.id === "categories" && user.role !== "admin") {
            return false;
          }
          return authService.hasPermission(user, item.permission);
        })
      : [];
  }, [user]);

  // Memoized sidebar classes
  const sidebarClasses = useMemo(
    () =>
      [
        styles.sidebar,
        sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed,
      ].join(" "),
    [sidebarOpen]
  );

  // Memoized role variant class
  const roleVariantClass = useMemo(() => {
    switch (user?.role) {
      case "admin":
        return styles.roleAdmin;
      case "owner":
        return styles.roleOwner;
      case "manager":
        return styles.roleManager;
      case "employee":
        return styles.roleEmployee;
      default:
        return styles.roleDefault;
    }
  }, [user?.role]);

  // Memoized role label
  const roleLabel = useMemo(
    () =>
      user?.role
        ? t(`header.role.${user.role}`)
        : t("header.role.default"),
    [user?.role, t]
  );

  // Memoized current page title
  const currentPageTitle = useMemo(
    () =>
      navigationItems.find((item) => item.id === currentPage)?.pageTitleKey ||
      "pages.dashboard",
    [navigationItems, currentPage]
  );

  // Memoized navigation handler
  const handleNavigate = useCallback(
    (page: AdminPageKey) => {
      onPageChange(page);
      setSidebarOpen(false);
    },
    [onPageChange]
  );

  return (
    <div className={styles.layout}>
      {sidebarOpen && (
        <div
          className={styles.sidebarOverlay}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside className={sidebarClasses} aria-label={t("brand")}>
        <div className={styles.sidebarContent}>
          <div>
            <div className={styles.sidebarHeader}>
              <h2 className={styles.brand}>{t("brand")}</h2>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className={styles.sidebarCloseButton}
                aria-label={t("nav.close")}
              >
                <X size={20} />
              </button>
            </div>

            <nav>
              <ul className={styles.navList}>
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <li key={item.id} className={styles.navItem}>
                      <button
                        type="button"
                        onClick={() => handleNavigate(item.id)}
                        className={
                          isActive
                            ? `${styles.navButton} ${styles.navButtonActive}`
                            : styles.navButton
                        }
                      >
                        <Icon size={20} />
                        {t(item.translationKey)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          <div className={styles.sidebarFooter}>
            <div className={styles.sidebarUser}>
              <div className={styles.sidebarUserInfo}>
                <div className={styles.sidebarUserTopRow}>
                  <div className={styles.userInitialLarge}>
                    {user ? user.firstName.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className={styles.userName}>
                    {user
                      ? `${user.firstName} ${user.lastName}`
                      : t("header.role.default")}
                  </div>
                </div>
                <div className={styles.sidebarBadgeRow}>
                  <span className={`${styles.roleBadge} ${roleVariantClass}`}>
                    {user?.role === "admin" && <Shield size={12} />}
                    {user?.role === "owner" && <UserCheck size={12} />}
                    {user?.role === "manager" && <TrendingUp size={12} />}
                    {user?.role === "employee" && <Store size={12} />}
                    {roleLabel}
                  </span>
                  <button
                    type="button"
                    onClick={logout}
                    className={styles.logoutButton}
                    title={t("header.logout")}
                    aria-label={t("header.logout")}
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className={styles.hamburgerButton}
              aria-label={t("nav.open")}
            >
              <Menu size={20} />
            </button>
            <h1 className={styles.title}>{t(currentPageTitle)}</h1>
          </div>

          <div className={styles.headerRight}>{headerActions}</div>
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
