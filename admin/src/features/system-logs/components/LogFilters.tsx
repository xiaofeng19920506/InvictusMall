import React from 'react';
import { Search, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import {
  setSearchTerm,
  setFilterLevel,
  setSelectedStoreId,
} from '../../../store/slices/systemLogsSlice';
import styles from '../SystemLogs.module.css';

type LogLevel = 'info' | 'warning' | 'error';
type FilterOption = 'all' | LogLevel;

const LogFilters: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { searchTerm, filterLevel, selectedStoreId, accessibleStores } = useAppSelector(
    (state) => state.systemLogs
  );

  const getLevelLabel = (level: LogLevel) => t(`systemLogs.filters.levels.${level}`);

  return (
    <div className={styles.controlsRow}>
      <div className={styles.searchWrapper}>
        <Search className={styles.searchIcon} />
        <input
          type="text"
          placeholder={t('systemLogs.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => dispatch(setSearchTerm(e.target.value))}
          className={styles.searchInput}
        />
      </div>
      {accessibleStores.length > 1 && (
        <div className={styles.filters}>
          <Filter className={styles.filterIcon} />
          <select
            value={selectedStoreId}
            onChange={(e) => dispatch(setSelectedStoreId(e.target.value))}
            className={styles.filterSelect}
          >
            <option value="all">{t('systemLogs.filters.allStores') || 'All Stores'}</option>
            {accessibleStores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className={styles.filters}>
        <Filter className={styles.filterIcon} />
        <select
          value={filterLevel}
          onChange={(e) => dispatch(setFilterLevel(e.target.value as FilterOption))}
          className={styles.filterSelect}
        >
          <option value="all">{t('systemLogs.filters.all')}</option>
          <option value="error">{getLevelLabel('error')}</option>
          <option value="warning">{getLevelLabel('warning')}</option>
          <option value="info">{getLevelLabel('info')}</option>
        </select>
      </div>
    </div>
  );
};

export default LogFilters;

