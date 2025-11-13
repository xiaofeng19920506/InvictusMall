import React, { useState, useEffect, useCallback } from "react";
import { FileText, Search, Filter, Download, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { activityLogApi } from "../services/api";
import type { ActivityLog } from "../types/store";
import styles from "./SystemLogs.module.css";

type LogLevel = "info" | "warning" | "error";

type FilterOption = "all" | LogLevel;

const SystemLogs: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState<FilterOption>("all");
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await activityLogApi.getRecentLogs(100);
      if (response.success && response.data) {
        setLogs(response.data);
      } else {
        setError(t("systemLogs.feedback.loadError"));
      }
    } catch (err: any) {
      console.error("Error loading logs:", err);
      setError(err.message || t("systemLogs.feedback.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const getLogLevel = (type: ActivityLog["type"]): LogLevel => {
    const normalized = type.toLowerCase();
    if (
      normalized.includes("error") ||
      normalized.includes("deleted") ||
      normalized.includes("failed")
    ) {
      return "error";
    }
    if (normalized.includes("warning") || normalized.includes("updated")) {
      return "warning";
    }
    return "info";
  };

  const filteredLogs = logs.filter((log) => {
    const logLevel = getLogLevel(log.type);
    const matchesSearch =
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.storeName &&
        log.storeName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterLevel === "all" || logLevel === filterLevel;
    return matchesSearch && matchesFilter;
  });

  const getLevelStyles = (level: LogLevel) => {
    switch (level) {
      case "error":
        return styles.levelError;
      case "warning":
        return styles.levelWarning;
      default:
        return styles.levelInfo;
    }
  };

  const getLevelLabel = (level: LogLevel) =>
    t(`systemLogs.filters.levels.${level}`);

  return (
    <div className={styles.container}>
      <section className={styles.card}>
        <div className={styles.header}>
          <h3 className={styles.headerTitle}>{t("systemLogs.title")}</h3>
          <p className={styles.headerSubtitle}>{t("systemLogs.subtitle")}</p>
        </div>

        <div className={styles.controls}>
          <div className={styles.controlsRow}>
            <div className={styles.searchWrapper}>
              <Search className={styles.searchIcon} />
              <input
                type="text"
                placeholder={t("systemLogs.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <div className={styles.filters}>
              <Filter className={styles.filterIcon} />
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value as FilterOption)}
                className={styles.filterSelect}
              >
                <option value="all">{t("systemLogs.filters.all")}</option>
                <option value="error">{getLevelLabel("error")}</option>
                <option value="warning">{getLevelLabel("warning")}</option>
                <option value="info">{getLevelLabel("info")}</option>
              </select>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              onClick={() => loadLogs()}
              className={`${styles.actionButton} ${styles.refreshButton}`}
              disabled={loading}
            >
              <RefreshCw
                className={loading ? "animate-spin h-4 w-4" : "h-4 w-4"}
              />
              {t("systemLogs.actions.refresh")}
            </button>
            <button
              type="button"
              className={`${styles.actionButton} ${styles.exportButton}`}
            >
              <Download className="h-4 w-4" />
              {t("systemLogs.actions.export")}
            </button>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.tableHeadCell}>
                  {t("systemLogs.table.timestamp")}
                </th>
                <th className={styles.tableHeadCell}>
                  {t("systemLogs.table.level")}
                </th>
                <th className={styles.tableHeadCell}>
                  {t("systemLogs.table.message")}
                </th>
                <th className={styles.tableHeadCell}>
                  {t("systemLogs.table.source")}
                </th>
                <th className={styles.tableHeadCell}>
                  {t("systemLogs.table.user")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const logLevel = getLogLevel(log.type);
                const timestamp =
                  log.timestamp instanceof Date
                    ? log.timestamp.toLocaleString()
                    : new Date(log.timestamp).toLocaleString();

                return (
                  <tr key={log.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>{timestamp}</td>
                    <td className={styles.tableCell}>
                      <span
                        className={`${styles.levelBadge} ${getLevelStyles(
                          logLevel
                        )}`}
                      >
                        {getLevelLabel(logLevel)}
                      </span>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.message}>{log.message}</div>
                      <div className={styles.messageMeta}>
                        {t("systemLogs.table.type", { type: log.type })}
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      {log.storeName || t("systemLogs.table.systemSource")}
                    </td>
                    <td className={styles.tableCell}>
                      {log.userName || t("systemLogs.table.unknownUser")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {loading && (
            <div className={styles.loadingState}>
              <div className={styles.loadingSpinner} aria-hidden />
              <p className={styles.emptyDescription}>
                {t("systemLogs.states.loading")}
              </p>
            </div>
          )}

          {error && !loading && (
            <div className={styles.errorState}>
              <p className={styles.emptyDescription}>{error}</p>
              <button onClick={() => loadLogs()} className={styles.retryButton}>
                {t("systemLogs.actions.retry")}
              </button>
            </div>
          )}

          {!loading && !error && filteredLogs.length === 0 && (
            <div className={styles.emptyState}>
              <FileText className={styles.emptyIcon} />
              <h3 className={styles.emptyTitle}>
                {t("systemLogs.states.empty.title")}
              </h3>
              <p className={styles.emptyDescription}>
                {searchTerm || filterLevel !== "all"
                  ? t("systemLogs.states.empty.filtered")
                  : t("systemLogs.states.empty.default")}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default SystemLogs;
