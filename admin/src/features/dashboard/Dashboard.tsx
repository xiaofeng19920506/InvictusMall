import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Store,
  TrendingUp,
  Users,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { storeApi, healthApi, activityLogApi } from "../../services/api";
import type { ActivityLog } from "../../shared/types/store";
import type { AdminPageKey } from "../../app/types";
import styles from "./Dashboard.module.css";

interface DashboardProps {
  onNavigate: (page: AdminPageKey) => void;
}

interface DashboardStats {
  totalStores: number;
  verifiedStores: number;
  totalCategories: number;
  avgRating: number;
  serverStatus: "online" | "offline";
  serverUptime?: number;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats>({
    totalStores: 0,
    verifiedStores: 0,
    totalCategories: 0,
    avgRating: 0,
    serverStatus: "offline",
  });
  const [loading, setLoading] = useState(true);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Memoized navigation handlers
  const handleNavigateStores = useCallback(() => {
    onNavigate("stores");
  }, [onNavigate]);

  const handleNavigateAnalytics = useCallback(() => {
    onNavigate("analytics");
  }, [onNavigate]);

  const handleNavigateUsers = useCallback(() => {
    onNavigate("users");
  }, [onNavigate]);

  // Memoized activity log loading
  const loadActivityLogs = useCallback(async () => {
    try {
      const response = await activityLogApi.getRecentLogs(10);
      if (response.success) {
        setActivityLogs(response.data || []);
      }
    } catch (error) {
      console.error("Error loading activity logs:", error);
      setActivityLogs([]);
    }
  }, []);

  // Memoized dashboard data loading
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const storesResponse = await storeApi.getAllStores();
      const stores = storesResponse.data || [];

      const totalStores = stores.length;
      const verifiedStores = stores.filter((store) => store.isVerified).length;
      const categories = new Set(stores.flatMap((store) => store.category));
      const avgRating =
        stores.length > 0
          ? stores.reduce((sum, store) => sum + store.rating, 0) /
            stores.length
          : 0;

      try {
        const healthResponse = await healthApi.checkHealth();
        setStats({
          totalStores,
          verifiedStores,
          totalCategories: categories.size,
          avgRating: Math.round(avgRating * 10) / 10,
          serverStatus: "online",
          serverUptime: healthResponse.uptime,
        });
      } catch (error) {
        setStats({
          totalStores,
          verifiedStores,
          totalCategories: categories.size,
          avgRating: Math.round(avgRating * 10) / 10,
          serverStatus: "offline",
        });
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setStats((prev) => ({ ...prev, serverStatus: "offline" }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    loadActivityLogs();
  }, [loadDashboardData, loadActivityLogs]);

  // Memoized activity card class function
  const activityCardClass = useCallback((type: ActivityLog["type"]) => {
    switch (type) {
      case "store_created":
        return `${styles.activityCard} ${styles.activityCreated}`;
      case "store_updated":
        return `${styles.activityCard} ${styles.activityUpdated}`;
      case "store_deleted":
        return `${styles.activityCard} ${styles.activityDeleted}`;
      case "store_verified":
        return `${styles.activityCard} ${styles.activityVerified}`;
      default:
        return `${styles.activityCard} ${styles.activityDefault}`;
    }
  }, []);

  // Memoized activity icon function
  const activityIcon = useCallback((type: ActivityLog["type"]) => {
    switch (type) {
      case "store_created":
        return <Plus />;
      case "store_updated":
        return <Edit />;
      case "store_deleted":
        return <Trash2 />;
      case "store_verified":
        return <Store />;
      default:
        return <Clock />;
    }
  }, []);

  // Memoized activity logs rendering
  const activityLogsList = useMemo(() => {
    if (activityLogs.length === 0) {
      return (
        <div className={styles.emptyState}>
          <Clock className={styles.emptyStateIcon} />
          <p>{t("dashboard.activity.empty")}</p>
        </div>
      );
    }

    return activityLogs.map((log) => (
      <div key={log.id} className={activityCardClass(log.type)}>
        <div className={styles.activityIcon}>{activityIcon(log.type)}</div>
        <div className={styles.activityText}>
          <p className={styles.activityMessage}>{log.message}</p>
          <p className={styles.activityMeta}>
            {log.metadata?.storeName && `${log.metadata.storeName} · `}
            {log.metadata?.actor && `${log.metadata.actor} · `}
            {log.metadata?.timestamp || log.timestamp}
          </p>
        </div>
      </div>
    ));
  }, [activityLogs, activityCardClass, activityIcon, t]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="loading" />
        <span>{t("dashboard.loading")}</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${styles.quickActions}`}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            {t("dashboard.quickActions.title")}
          </h3>
        </div>
        <div className={styles.quickActionsButtons}>
          <button
            className="btn btn-primary"
            onClick={handleNavigateStores}
          >
            <Store size={16} />
            {t("dashboard.quickActions.addStore")}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleNavigateAnalytics}
          >
            <TrendingUp size={16} />
            {t("dashboard.quickActions.viewAnalytics")}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleNavigateUsers}
          >
            <Users size={16} />
            {t("dashboard.quickActions.manageUsers")}
          </button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div>
              <div className={styles.statLabel}>
                {t("dashboard.stats.totalStores")}
              </div>
              <div className={styles.statValue}>{stats.totalStores}</div>
            </div>
            <div className={`${styles.statIcon} ${styles.iconBlue}`}>
              <Store />
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div>
              <div className={styles.statLabel}>
                {t("dashboard.stats.verifiedStores")}
              </div>
              <div className={styles.statValue}>{stats.verifiedStores}</div>
            </div>
            <div className={`${styles.statIcon} ${styles.iconGreen}`}>
              <TrendingUp />
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div>
              <div className={styles.statLabel}>
                {t("dashboard.stats.categories")}
              </div>
              <div className={styles.statValue}>{stats.totalCategories}</div>
            </div>
            <div className={`${styles.statIcon} ${styles.iconPurple}`}>
              <Users />
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div>
              <div className={styles.statLabel}>
                {t("dashboard.stats.averageRating")}
              </div>
              <div className={styles.statValue}>{stats.avgRating}</div>
            </div>
            <div className={`${styles.statIcon} ${styles.iconYellow}`}>
              <DollarSign />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>{t("dashboard.activity.title")}</h3>
          <p className={styles.cardSubtitle}>
            {t("dashboard.activity.subtitle")}
          </p>
        </div>

        <div className={styles.activityList}>{activityLogsList}</div>

        <div className={styles.statusRow}>
          <span className={styles.cardSubtitle}>
            {t("dashboard.serverStatus")}
          </span>
          <span
            className={`${styles.statusBadge} ${
              stats.serverStatus === "online"
                ? styles.statusOnline
                : styles.statusOffline
            }`}
          >
            {stats.serverStatus === "online"
              ? t("dashboard.status.online")
              : t("dashboard.status.offline")}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

