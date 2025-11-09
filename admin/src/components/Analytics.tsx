import React from "react";
import { TrendingUp, Users, Store, DollarSign } from "lucide-react";
import { useTranslation } from "react-i18next";
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

  const stats: StatDefinition[] = [
    {
      key: "revenue",
      value: "$45,231",
      change: "+20.1%",
      changeType: "positive",
      icon: DollarSign,
    },
    {
      key: "stores",
      value: "12",
      change: "+2",
      changeType: "positive",
      icon: Store,
    },
    {
      key: "users",
      value: "2,350",
      change: "+180",
      changeType: "positive",
      icon: Users,
    },
    {
      key: "growth",
      value: "12.5%",
      change: "+2.4%",
      changeType: "positive",
      icon: TrendingUp,
    },
  ];

  const activities: ActivityDefinition[] = [
    { key: "newStore", type: "store" },
    { key: "purchase", type: "user" },
    { key: "inventory", type: "store" },
    { key: "registration", type: "user" },
  ];

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
