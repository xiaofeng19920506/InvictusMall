import React from 'react';
import { Users, Mail, Phone, Calendar, Edit, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../../store/hooks';
import { useGetAllStaffQuery } from '../../../store/api/staffApi';
import type { Staff } from '../../../services/api';
import styles from '../UsersManagement.module.css';

interface UserTableProps {
  onEdit: (user: Staff) => void;
}

const UserTable: React.FC<UserTableProps> = ({ onEdit }) => {
  const { t } = useTranslation();
  const { currentPage, itemsPerPage } = useAppSelector((state) => state.users);
  const { data: usersData } = useGetAllStaffQuery({
    limit: itemsPerPage,
    offset: (currentPage - 1) * itemsPerPage,
  });
  const users = usersData?.staff || [];
  const searchTerm = useAppSelector((state) => state.users.searchTerm);
  const filterRole = useAppSelector((state) => state.users.filterRole);
  const selectedStoreId = useAppSelector((state) => state.users.selectedStoreId);
  const currentUser = useAppSelector((state) => state.auth.user);

  const filteredUsers = users.filter((user) => {
    // Exclude current user
    if (user.id === currentUser?.id) {
      return false;
    }
    // Filter by selected store if not "all"
    if (selectedStoreId !== 'all') {
      const userStoreId = (user as any).storeId;
      if (userStoreId !== selectedStoreId) {
        return false;
      }
    }
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phoneNumber.includes(searchTerm);
    const matchesFilter = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesFilter;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return styles.roleAdmin;
      case 'owner':
        return styles.roleOwner;
      case 'manager':
        return styles.roleManager || styles.roleDefault;
      case 'employee':
        return styles.roleEmployee || styles.roleDefault;
      default:
        return styles.roleDefault;
    }
  };

  return (
    <div className={styles.tableWrapper}>
      <table className="table">
        <thead>
          <tr>
            <th>{t('users.table.user')}</th>
            <th>{t('users.table.role')}</th>
            <th>{t('users.table.contact')}</th>
            <th>{t('users.table.status')}</th>
            <th>{t('users.table.joined')}</th>
            <th>{t('users.table.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map((user) => (
            <tr key={user.id}>
              <td>
                <div className={styles.userCell}>
                  <div className={styles.userAvatar}>
                    <Users className="w-5 h-5" />
                  </div>
                  <div className={styles.userInfo}>
                    <div className={styles.userName}>
                      {user.firstName} {user.lastName}
                    </div>
                    <div className={styles.userEmail}>{user.email}</div>
                  </div>
                </div>
              </td>
              <td>
                <span
                  className={`${styles.roleBadge} ${getRoleBadgeColor(user.role)}`}
                >
                  {t(`users.roles.${user.role}`, {
                    defaultValue: user.role.replace('_', ' ').toUpperCase(),
                  })}
                </span>
              </td>
              <td>
                <div className={styles.contactInfo}>
                  <div className={styles.contactRow}>
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{user.email}</span>
                  </div>
                  {user.phoneNumber && (
                    <div className={styles.contactRow}>
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{user.phoneNumber}</span>
                    </div>
                  )}
                </div>
              </td>
              <td>
                <div className={styles.statusColumn}>
                  <span
                    className={`${styles.statusBadge} ${
                      user.isActive ? styles.statusActive : styles.statusInactive
                    }`}
                  >
                    {user.isActive ? t('users.status.active') : t('users.status.inactive')}
                  </span>
                  {user.emailVerified ? (
                    <div className={styles.verifiedRow}>
                      <Shield className="w-3 h-3" />
                      {t('users.status.emailVerified')}
                    </div>
                  ) : (
                    <div className={styles.unverified}>
                      {t('users.status.emailUnverified')}
                    </div>
                  )}
                </div>
              </td>
              <td>
                <div className={styles.dateRow}>
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
              </td>
              <td>
                <div className={styles.userActions}>
                  <button
                    onClick={() => onEdit(user)}
                    className="btn btn-secondary btn-sm"
                    title={t('users.actions.editTitle')}
                    disabled={!user.canEdit}
                    style={{
                      opacity: user.canEdit ? 1 : 0.5,
                      cursor: user.canEdit ? 'pointer' : 'not-allowed',
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserTable;

