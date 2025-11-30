import React from 'react';
import { Search, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import {
  setSearchQuery,
  setStatusFilter,
  setSelectedStoreId,
} from '../../../store/slices/ordersSlice';
import styles from '../OrdersManagement.module.css';

const OrderFilters: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { searchQuery, statusFilter, selectedStoreId, accessibleStores } = useAppSelector(
    (state) => state.orders
  );

  return (
    <div className={styles.filters}>
      <div className={styles.searchBox}>
        <Search className={styles.searchIcon} />
        <input
          type="text"
          placeholder={t('orders.search.placeholder') || 'Search orders...'}
          value={searchQuery}
          onChange={(e) => dispatch(setSearchQuery(e.target.value))}
          className={styles.searchInput}
        />
      </div>
      {accessibleStores.length > 1 && (
        <div className={styles.filterBox}>
          <Filter className={styles.filterIcon} />
          <select
            value={selectedStoreId}
            onChange={(e) => dispatch(setSelectedStoreId(e.target.value))}
            className={styles.filterSelect}
          >
            <option value="all">{t('orders.filter.allStores') || 'All Stores'}</option>
            {accessibleStores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className={styles.filterBox}>
        <Filter className={styles.filterIcon} />
        <select
          value={statusFilter}
          onChange={(e) => dispatch(setStatusFilter(e.target.value))}
          className={styles.filterSelect}
        >
          <option value="">{t('orders.filter.allStatuses') || 'All Statuses'}</option>
          <option value="pending_payment">
            {t('orders.status.pending_payment') || 'Pending Payment'}
          </option>
          <option value="pending">{t('orders.status.pending') || 'Pending'}</option>
          <option value="processing">{t('orders.status.processing') || 'Processing'}</option>
          <option value="shipped">{t('orders.status.shipped') || 'Shipped'}</option>
          <option value="delivered">{t('orders.status.delivered') || 'Delivered'}</option>
          <option value="cancelled">{t('orders.status.cancelled') || 'Cancelled'}</option>
          <option value="return_processing">
            {t('orders.status.return_processing') || 'Return Processing'}
          </option>
          <option value="returned">{t('orders.status.returned') || 'Returned'}</option>
        </select>
      </div>
    </div>
  );
};

export default OrderFilters;

