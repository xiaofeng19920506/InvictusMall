import React, { useEffect } from "react";
import { Download, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import LogFilters from "./components/LogFilters";
import LogTable from "./components/LogTable";
import {
  fetchLogs,
  fetchAccessibleStores,
} from "../../store/slices/systemLogsSlice";
import styles from "./SystemLogs.module.css";

const SystemLogs: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.systemLogs);

  useEffect(() => {
    dispatch(fetchAccessibleStores());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchLogs(100));
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchLogs(100));
  };

  return (
    <div className={styles.container}>
      <section className={styles.card}>
        <div className={styles.controls}>
          <LogFilters />

          <div className={styles.actions}>
            <button
              onClick={handleRefresh}
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
            <button onClick={handleRefresh} className={styles.retryButton}>
              {t("systemLogs.actions.retry")}
            </button>
          </div>
        )}

        {!loading && !error && <LogTable />}
      </section>
    </div>
  );
};

export default SystemLogs;
