import React from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import {
  setSearchTerm,
  setFilterRole,
  setSelectedStoreId,
} from '../../../store/slices/usersSlice';
import styles from '../UsersManagement.module.css';

const UserFilters: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { searchTerm, filterRole, selectedStoreId, accessibleStores } = useAppSelector(
    (state) => state.users
  );

  return (
    <div className={styles.filters}>
      <div className={styles.searchWrapper}>
        <Search className={styles.searchIcon} />
        <input
          type="text"
          placeholder={t('users.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => dispatch(setSearchTerm(e.target.value))}
          className={`form-input ${styles.searchInput}`}
        />
      </div>
      {accessibleStores.length > 1 && (
        <div>
          <select
            value={selectedStoreId}
            onChange={(e) => dispatch(setSelectedStoreId(e.target.value))}
            className={`form-input form-select ${styles.roleSelect}`}
          >
            <option value="all">{t('users.filters.allStores') || 'All Stores'}</option>
            {accessibleStores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <select
          value={filterRole}
          onChange={(e) => dispatch(setFilterRole(e.target.value))}
          className={`form-input form-select ${styles.roleSelect}`}
        >
          <option value="all">{t('users.filters.allRoles')}</option>
          <option value="admin">{t('users.filters.admin')}</option>
          <option value="owner">{t('users.filters.owner') || 'Owner'}</option>
          <option value="manager">{t('users.filters.manager') || 'Manager'}</option>
          <option value="employee">{t('users.filters.employee') || 'Employee'}</option>
        </select>
      </div>
    </div>
  );
};

export default UserFilters;

