import React, { useEffect, useState } from "react";
import { TrendingUp, Users, Store as StoreIcon, DollarSign } from "lucide-react";
import { useTranslation } from "react-i18next";
import { storeApi, activityLogApi } from "../../services/api";
import type { Store, ActivityLog } from "../../shared/types/store";
import styles from "./Analytics.module.css";

interface StatDefinition {
  key: "revenue" | "stores" | "users" | "growth";
  value: string;
  change: string;
  changeType: "positive" | "negative";
  icon: React.ComponentType<{ className?: string }>;
}

interface ActivityDefinition {
  key: "newStore" | "purchase" | "inventory" | "registration";
  type: "store" | "user";
}

const Analytics: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const [storesResponse, logsResponse] = await Promise.all([
        storeApi.getAllStores(),
        activityLogApi.getRecentLogs(100),
      ]);

      if (storesResponse.success && storesResponse.data) {
        setStores(storesResponse.data);
      } else {
        setStores([]);
      }

      if (logsResponse.success && logsResponse.data) {
        setActivityLogs(logsResponse.data);
      } else {
        setActivityLogs([]);
      }
    } catch (error) {
      console.error("Error loading analytics data:", error);
      setStores([]);
      setActivityLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const totalStores = stores.length || 0;
  const activeStores = stores.filter((s) => s.isActive).length || 0;
  
  // Calculate revenue (placeholder - would need actual order data)
  const revenue = 0;
  
  // Calculate growth rate (placeholder - would need historical data)
  const growthRate = 0;

  // Format numbers with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return `$${formatNumber(amount)}`;
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  const stats: StatDefinition[] = [
    {
      key: "revenue",
      value: formatCurrency(revenue),
      change: "+0%",
      changeType: "positive",
      icon: DollarSign,
    },
    {
      key: "stores",
      value: formatNumber(totalStores),
      change: `+${activeStores}`,
      changeType: "positive",
      icon: StoreIcon,
    },
    {
      key: "users",
      value: formatNumber(0), // Would need user count from API
      change: "+0",
      changeType: "positive",
      icon: Users,
    },
    {
      key: "growth",
      value: formatPercentage(growthRate),
      change: "+0%",
      changeType: growthRate >= 0 ? "positive" : "negative",
      icon: TrendingUp,
    },
  ];

  // Get recent activities from activity logs
  const recentActivities = activityLogs.slice(0, 4).map((log) => {
    const type = log.type.toLowerCase();
    let activityKey: ActivityDefinition["key"] = "newStore";
    let activityType: ActivityDefinition["type"] = "store";

    if (type.includes("store") || type.includes("created")) {
      activityKey = "newStore";
      activityType = "store";
    } else if (type.includes("purchase") || type.includes("order")) {
      activityKey = "purchase";
      activityType = "user";
    } else if (type.includes("inventory") || type.includes("updated")) {
      activityKey = "inventory";
      activityType = "store";
    } else if (type.includes("user") || type.includes("registration")) {
      activityKey = "registration";
      activityType = "user";
    }

    return { key: activityKey, type: activityType };
  });

  // Default activities if no logs
  const activities: ActivityDefinition[] =
    recentActivities.length > 0
      ? recentActivities
      : [
          { key: "newStore", type: "store" },
          { key: "purchase", type: "user" },
          { key: "inventory", type: "store" },
          { key: "registration", type: "user" },
        ];

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className="loading" />
          <span>{t("analytics.loading")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <section className={styles.statsCard}>
        <header className="card-header">
          <h3 className="card-title">{t("analytics.title")}</h3>
          <p className="card-subtitle">{t("analytics.subtitle")}</p>
        </header>

        <div className={styles.statsGrid}>
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.key} className={styles.statCard}>
                <div className={styles.statHeader}>
                  <div>
                    <p className={styles.statTitle}>
                      {t(`analytics.stats.${stat.key}.title`)}
                    </p>
                    <p className={styles.statValue}>{stat.value}</p>
                  </div>
                  <span className={styles.statIcon}>
                    <Icon className="h-6 w-6" />
                  </span>
                </div>
                <div className={styles.statFooter}>
                  <span
                    className={`${styles.statChange} ${
                      stat.changeType === "positive"
                        ? styles.changePositive
                        : styles.changeNegative
                    }`}
                  >
                    {stat.change}
                  </span>
                  <span className={styles.changeLabel}>
                    {t("analytics.stats.changeLabel")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.chartsGrid}>
        <article className={styles.chartCard}>
          <h3 className={styles.chartTitle}>{t("analytics.charts.revenue")}</h3>
          <div className={styles.chartPlaceholder}>
            {t("analytics.charts.revenuePlaceholder")}
          </div>
        </article>

        <article className={styles.chartCard}>
          <h3 className={styles.chartTitle}>{t("analytics.charts.stores")}</h3>
          <div className={styles.chartPlaceholder}>
            {t("analytics.charts.storesPlaceholder")}
          </div>
        </article>
      </section>

      <section className={styles.activityCard}>
        <h3 className={styles.activityTitle}>{t("analytics.activity.title")}</h3>
        <div className={styles.activityList}>
          {activities.map((activity) => (
            <div key={activity.key} className={styles.activityItem}>
              <span
                className={`${styles.activityDot} ${
                  activity.type === "store"
                    ? styles.activityDotStore
                    : styles.activityDotUser
                }`}
                aria-hidden="true"
              />
              <div className={styles.activityContent}>
                <p className={styles.activityAction}>
                  {t(`analytics.activity.items.${activity.key}.action`)}
                </p>
                <p className={styles.activityTime}>
                  {t(`analytics.activity.items.${activity.key}.time`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Analytics;
