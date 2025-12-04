import React from 'react';
import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../../store/hooks';
import { useGetRecentLogsQuery } from '../../../store/api/activityLogsApi';
import type { ActivityLog } from '../../../shared/types/store';
import styles from '../SystemLogs.module.css';

type LogLevel = 'info' | 'warning' | 'error';

const LogTable: React.FC = () => {
  const { t } = useTranslation();
  const { data: logs = [] } = useGetRecentLogsQuery(100);
  const { searchTerm, filterLevel, selectedStoreId } = useAppSelector(
    (state) => state.systemLogs
  );

  const getLogLevel = (type: ActivityLog['type']): LogLevel => {
    const normalized = type.toLowerCase();
    if (
      normalized.includes('error') ||
      normalized.includes('deleted') ||
      normalized.includes('failed')
    ) {
      return 'error';
    }
    if (normalized.includes('warning') || normalized.includes('updated')) {
      return 'warning';
    }
    return 'info';
  };

  const filteredLogs = logs.filter((log) => {
    // Filter by selected store if not "all"
    if (selectedStoreId !== 'all') {
      const logStoreId = (log as any).storeId;
      if (logStoreId !== selectedStoreId) {
        return false;
      }
    }
    const logLevel = getLogLevel(log.type);
    const matchesSearch =
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.storeName &&
        log.storeName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterLevel === 'all' || logLevel === filterLevel;
    return matchesSearch && matchesFilter;
  });

  const getLevelStyles = (level: LogLevel) => {
    switch (level) {
      case 'error':
        return styles.levelError;
      case 'warning':
        return styles.levelWarning;
      default:
        return styles.levelInfo;
    }
  };

  const getLevelLabel = (level: LogLevel) => t(`systemLogs.filters.levels.${level}`);

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead className={styles.tableHead}>
          <tr>
            <th className={styles.tableHeadCell}>{t('systemLogs.table.timestamp')}</th>
            <th className={styles.tableHeadCell}>{t('systemLogs.table.level')}</th>
            <th className={styles.tableHeadCell}>{t('systemLogs.table.message')}</th>
            <th className={styles.tableHeadCell}>{t('systemLogs.table.source')}</th>
            <th className={styles.tableHeadCell}>{t('systemLogs.table.user')}</th>
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
                    className={`${styles.levelBadge} ${getLevelStyles(logLevel)}`}
                  >
                    {getLevelLabel(logLevel)}
                  </span>
                </td>
                <td className={styles.tableCell}>
                  <div className={styles.message}>{log.message}</div>
                  <div className={styles.messageMeta}>
                    {t('systemLogs.table.type', { type: log.type })}
                  </div>
                </td>
                <td className={styles.tableCell}>
                  {log.storeName || t('systemLogs.table.systemSource')}
                </td>
                <td className={styles.tableCell}>
                  {log.userName || t('systemLogs.table.unknownUser')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {filteredLogs.length === 0 && (
        <div className={styles.emptyState}>
          <FileText className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>{t('systemLogs.states.empty.title')}</h3>
          <p className={styles.emptyDescription}>
            {searchTerm || filterLevel !== 'all'
              ? t('systemLogs.states.empty.filtered')
              : t('systemLogs.states.empty.default')}
          </p>
        </div>
      )}
    </div>
  );
};

export default LogTable;

