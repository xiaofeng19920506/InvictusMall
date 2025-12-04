import React, { useEffect } from "react";
import { Download, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import LogFilters from "./components/LogFilters";
import LogTable from "./components/LogTable";
import {
  useGetRecentLogsQuery,
  useGetMyStoresForLogsQuery,
} from "../../store/api/activityLogsApi";
import { useGetAllStoresQuery } from "../../store/api/storesApi";
import { setAccessibleStores } from "../../store/slices/systemLogsSlice";
import styles from "./SystemLogs.module.css";

const SystemLogs: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);

  // RTK Query hooks
  const {
    data: logs,
    isLoading: loading,
    error: queryError,
    refetch: refetchLogs,
  } = useGetRecentLogsQuery(100);

  const { data: myStores } = useGetMyStoresForLogsQuery(undefined, {
    skip: currentUser?.role === "admin",
  });

  const { data: allStores } = useGetAllStoresQuery(undefined, {
    skip: currentUser?.role !== "admin",
  });

  const error = queryError ? String(queryError) : null;

  // Update accessible stores in Redux
  useEffect(() => {
    const stores = currentUser?.role === "admin" ? allStores || [] : myStores || [];
    if (stores.length > 0) {
      dispatch(setAccessibleStores(stores));
    }
  }, [dispatch, allStores, myStores, currentUser?.role]);

  const handleRefresh = () => {
    refetchLogs();
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
