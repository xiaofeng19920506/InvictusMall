import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Store,
  TrendingUp,
  Users,
  DollarSign,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { storeApi, healthApi } from "../../services/api";
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
  }, [loadDashboardData]);


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

      {/* Analytics Section */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>{t("analytics.title") || "Analytics"}</h3>
          <p className={styles.cardSubtitle}>{t("analytics.subtitle") || "Data insights and trends"}</p>
        </div>

        <div className={styles.analyticsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <div>
                <div className={styles.statLabel}>{t("analytics.stats.revenue.title") || "Revenue"}</div>
                <div className={styles.statValue}>$0</div>
              </div>
              <div className={`${styles.statIcon} ${styles.iconYellow}`}>
                <DollarSign />
              </div>
            </div>
            <div className={styles.statFooter}>
              <span className={`${styles.statChange} ${styles.changePositive}`}>+0%</span>
              <span className={styles.changeLabel}>{t("analytics.stats.changeLabel") || "vs last period"}</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <div>
                <div className={styles.statLabel}>{t("analytics.stats.stores.title") || "Total Stores"}</div>
                <div className={styles.statValue}>{stats.totalStores}</div>
              </div>
              <div className={`${styles.statIcon} ${styles.iconBlue}`}>
                <Store />
              </div>
            </div>
            <div className={styles.statFooter}>
              <span className={`${styles.statChange} ${styles.changePositive}`}>+{stats.verifiedStores}</span>
              <span className={styles.changeLabel}>{t("analytics.stats.changeLabel") || "vs last period"}</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <div>
                <div className={styles.statLabel}>{t("analytics.stats.users.title") || "Users"}</div>
                <div className={styles.statValue}>0</div>
              </div>
              <div className={`${styles.statIcon} ${styles.iconPurple}`}>
                <Users />
              </div>
            </div>
            <div className={styles.statFooter}>
              <span className={`${styles.statChange} ${styles.changePositive}`}>+0</span>
              <span className={styles.changeLabel}>{t("analytics.stats.changeLabel") || "vs last period"}</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <div>
                <div className={styles.statLabel}>{t("analytics.stats.growth.title") || "Growth Rate"}</div>
                <div className={styles.statValue}>+0.0%</div>
              </div>
              <div className={`${styles.statIcon} ${styles.iconGreen}`}>
                <TrendingUp />
              </div>
            </div>
            <div className={styles.statFooter}>
              <span className={`${styles.statChange} ${styles.changePositive}`}>+0%</span>
              <span className={styles.changeLabel}>{t("analytics.stats.changeLabel") || "vs last period"}</span>
            </div>
          </div>
        </div>

        <div className={styles.chartsGrid}>
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>{t("analytics.charts.revenue") || "Revenue Trend"}</h3>
            <div className={styles.chartPlaceholder}>
              {t("analytics.charts.revenuePlaceholder") || "Chart visualization coming soon"}
            </div>
          </div>

          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>{t("analytics.charts.stores") || "Store Growth"}</h3>
            <div className={styles.chartPlaceholder}>
              {t("analytics.charts.storesPlaceholder") || "Chart visualization coming soon"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

