import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Edit,
  Trash2,
  Shield,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import EditUserModal from "./EditUserModal";
import { staffApi, type Staff } from "../services/api";
import styles from "./UsersManagement.module.css";

type User = Staff;

const UsersManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { showError, showInfo } = useNotification();
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await staffApi.getAllStaff();
      if (response.success) {
        setUsers(response.data || []);
      }
    } catch (error: any) {
      console.error("Error loading users:", error);
      if (error.response?.status !== 404) {
        showError(t("users.loadError"));
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      user.phoneNumber.includes(searchTerm);
    const matchesFilter = filterRole === "all" || user.role === filterRole;
    return matchesSearch && matchesFilter;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return styles.roleAdmin;
      case "owner":
        return styles.roleOwner;
      case "manager":
        return styles.roleManager || styles.roleDefault;
      case "employee":
        return styles.roleEmployee || styles.roleDefault;
      default:
        return styles.roleDefault;
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="loading" />
        <span>{t("users.loading")}</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h2 className={styles.title}>{t("users.title")}</h2>
          <p className={styles.subtitle}>{t("users.subtitle")}</p>
        </div>
      </div>

      <div className="card">
        <div className={styles.filters}>
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              placeholder={t("users.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`form-input ${styles.searchInput}`}
            />
          </div>
          <div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className={`form-input form-select ${styles.roleSelect}`}
            >
              <option value="all">{t("users.filters.allRoles")}</option>
              <option value="admin">{t("users.filters.admin")}</option>
              <option value="owner">{t("users.filters.owner") || "Owner"}</option>
              <option value="manager">{t("users.filters.manager") || "Manager"}</option>
              <option value="employee">{t("users.filters.employee") || "Employee"}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            {t("users.table.title", { count: filteredUsers.length })}
          </h3>
        </div>

        <div className={styles.tableWrapper}>
          <table className="table">
            <thead>
              <tr>
                <th>{t("users.table.user")}</th>
                <th>{t("users.table.role")}</th>
                <th>{t("users.table.contact")}</th>
                <th>{t("users.table.status")}</th>
                <th>{t("users.table.joined")}</th>
                <th>{t("users.table.actions")}</th>
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
                      className={`${styles.roleBadge} ${getRoleBadgeColor(
                        user.role
                      )}`}
                    >
                      {t(`users.roles.${user.role}`, {
                        defaultValue: user.role.replace("_", " ").toUpperCase(),
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
                          user.isActive
                            ? styles.statusActive
                            : styles.statusInactive
                        }`}
                      >
                        {user.isActive
                          ? t("users.status.active")
                          : t("users.status.inactive")}
                      </span>
                      {user.emailVerified ? (
                        <div className={styles.verifiedRow}>
                          <Shield className="w-3 h-3" />
                          {t("users.status.emailVerified")}
                        </div>
                      ) : (
                        <div className={styles.unverified}>
                          {t("users.status.emailUnverified")}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className={styles.dateRow}>
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.userActions}>
                      <button
                        onClick={() => setEditingUser(user)}
                        className="btn btn-secondary btn-sm"
                        title={t("users.actions.editTitle")}
                        disabled={!user.canEdit}
                        style={{ opacity: user.canEdit ? 1 : 0.5, cursor: user.canEdit ? 'pointer' : 'not-allowed' }}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {user.canEdit && currentUser?.role === "admin" &&
                        user.id !== currentUser.id && (
                        <button
                          onClick={() => {
                            const actionText = user.isActive
                              ? t("users.actions.deactivate")
                              : t("users.actions.activate");
                            showInfo(t("users.actions.toggleSoon"));
                          }}
                          className={`btn btn-sm ${
                            user.isActive ? "btn-warning" : "btn-success"
                          }`}
                          title={
                            user.isActive
                              ? t("users.actions.deactivateTitle")
                              : t("users.actions.activateTitle")
                          }
                        >
                          {user.isActive
                            ? t("users.actions.deactivate")
                            : t("users.actions.activate")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {filteredUsers.length === 0 && (
        <div className={styles.emptyState}>
          <Users className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>{t("users.empty.title")}</h3>
          <p className={styles.emptyDescription}>
            {searchTerm || filterRole !== "all"
              ? t("users.empty.filtered")
              : t("users.empty.default")}
          </p>
        </div>
      )}

      <div className={styles.note}>
        <p>
          <strong>{t("users.note.title")} </strong>
          {t("users.note.description")}
        </p>
      </div>

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={() => {
            loadUsers();
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
};

export default UsersManagement;

