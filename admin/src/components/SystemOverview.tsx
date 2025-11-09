import React from "react";
import { ExternalLink, Database, Globe, Monitor, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import styles from "./SystemOverview.module.css";

type FlowKey = "customer" | "frontend" | "backend" | "database" | "admin";

type FeatureKey =
  | "navigation"
  | "sync"
  | "monitoring"
  | "branding"
  | "documentation";

type QuickKey = "store" | "api" | "admin";

const SystemOverview: React.FC = () => {
  const { t } = useTranslation();

  const systemFlow: Array<{
    key: FlowKey;
    icon: React.ReactNode | string;
    className: string;
    url?: string;
  }> = [
    {
      key: "customer",
      icon: "👤",
      className: styles.flowCustomer,
    },
    {
      key: "frontend",
      icon: <Globe className="w-5 h-5" />,
      className: styles.flowFrontend,
      url: "http://localhost:3000",
    },
    {
      key: "backend",
      icon: <Database className="w-5 h-5" />,
      className: styles.flowBackend,
      url: "http://localhost:3001",
    },
    {
      key: "database",
      icon: "🗄️",
      className: styles.flowDatabase,
    },
    {
      key: "admin",
      icon: <Monitor className="w-5 h-5" />,
      className: styles.flowAdmin,
      url: "http://localhost:3003",
    },
  ];

  const integrationFeatures: FeatureKey[] = [
    "navigation",
    "sync",
    "monitoring",
    "branding",
    "documentation",
  ];

  const quickAccess: Array<{
    key: QuickKey;
    href?: string;
    icon: React.ReactNode;
    linkClass?: string;
  }> = [
    {
      key: "store",
      href: "http://localhost:3000",
      icon: <Globe className={`${styles.quickIconStore} w-6 h-6`} />,
      linkClass: `${styles.quickLink} ${styles.linkStore}`,
    },
    {
      key: "api",
      href: "http://localhost:3001/api-docs",
      icon: <Database className={`${styles.quickIconApi} w-6 h-6`} />,
      linkClass: `${styles.quickLink} ${styles.linkApi}`,
    },
    {
      key: "admin",
      icon: <Monitor className={`${styles.quickIconAdmin} w-6 h-6`} />,
      linkClass: `${styles.quickLink} ${styles.linkAdmin}`,
    },
  ];

  return (
    <div className={styles.container}>
      <section className={styles.cardSection}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>{t("systemOverview.architecture.title")}</h3>
          <p className={styles.cardSubtitle}>
            {t("systemOverview.architecture.subtitle")}
          </p>
        </div>

        <div className={styles.flowWrapper}>
          {systemFlow.map((item, index) => (
            <React.Fragment key={item.key}>
              <div className={styles.flowNode}>
                <div className={`${styles.flowIcon} ${item.className}`}>
                  {item.icon}
                </div>
                <h4 className={styles.flowName}>
                  {t(`systemOverview.architecture.flow.${item.key}.name`)}
                </h4>
                <p className={styles.flowDescription}>
                  {t(`systemOverview.architecture.flow.${item.key}.description`)}
                </p>
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.flowLink}
                  >
                    {t("systemOverview.architecture.openLink")}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : null}
              </div>
              {index < systemFlow.length - 1 ? (
                <ArrowRight className={styles.arrow} aria-hidden />
              ) : null}
            </React.Fragment>
          ))}
        </div>
      </section>

      <section className={styles.cardSection}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>{t("systemOverview.integration.title")}</h3>
          <p className={styles.cardSubtitle}>
            {t("systemOverview.integration.subtitle")}
          </p>
        </div>

        <div className={styles.integrationGrid}>
          {integrationFeatures.map((feature) => (
            <div key={feature} className={styles.featureCard}>
              <div className={styles.featureHeader}>
                <h4 className={styles.featureTitle}>
                  {t(`systemOverview.integration.features.${feature}.title`)}
                </h4>
                <span className={styles.featureStatus}>
                  {t(`systemOverview.integration.features.${feature}.status`)}
                </span>
              </div>
              <p className={styles.featureDescription}>
                {t(`systemOverview.integration.features.${feature}.description`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.cardSection}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>{t("systemOverview.quickAccess.title")}</h3>
          <p className={styles.cardSubtitle}>
            {t("systemOverview.quickAccess.subtitle")}
          </p>
        </div>

        <div className={styles.quickGrid}>
          {quickAccess.map((item) => {
            const content = (
              <>
                <div className={styles.quickHeader}>
                  {item.icon}
                  <h4 className={styles.quickTitle}>
                    {t(`systemOverview.quickAccess.cards.${item.key}.title`)}
                  </h4>
                  {item.key === "store" || item.key === "api" ? (
                    <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
                  ) : (
                    <span className={styles.currentBadge}>
                      {t("systemOverview.quickAccess.currentBadge")}
                    </span>
                  )}
                </div>
                <p className={styles.quickDescription}>
                  {t(`systemOverview.quickAccess.cards.${item.key}.description`)}
                </p>
                <div className={styles.quickAddress}>
                  {t(`systemOverview.quickAccess.cards.${item.key}.host`)}
                </div>
              </>
            );

            if (item.href) {
              return (
                <a
                  key={item.key}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={item.linkClass || styles.quickLink}
                >
                  {content}
                </a>
              );
            }

            return (
              <div key={item.key} className={item.linkClass || styles.quickLink}>
                {content}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default SystemOverview;
