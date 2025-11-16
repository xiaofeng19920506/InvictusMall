import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Edit,
  Shield,
  Mail,
  Phone,
  Calendar,
  Plus,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { useNotification } from "../../contexts/NotificationContext";
import { useAdminHeader } from "../../shared/hooks/useAdminHeader";
import Pagination from "../../shared/components/Pagination";
import EditUserModal from "./EditUserModal";
import { staffApi, storeApi, type Staff } from "../../services/api";
import type { Store } from "../../shared/types/store";
import styles from "./UsersManagement.module.css";

type User = Staff;

interface RegisterFormData {
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "owner" | "manager" | "employee";
  department: string;
  employeeId: string;
  storeId: string;
}

const UsersManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { showError, showInfo, showSuccess } = useNotification();
  const { setHeaderActions } = useAdminHeader();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [registerFormData, setRegisterFormData] = useState<RegisterFormData>({
    email: "",
    firstName: "",
    lastName: "",
    role: "employee",
    department: "",
    employeeId: "",
    storeId: "",
  });
  const [registerError, setRegisterError] = useState<string>("");
  const [registerSuccess, setRegisterSuccess] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
    if (currentUser && (currentUser.role === "admin" || currentUser.role === "owner" || currentUser.role === "manager")) {
      if (currentUser.role === "admin") {
        loadStores();
      } else {
        loadStoresForOwnerOrManager();
      }
    }
  }, [currentUser, currentPage, itemsPerPage]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;
      const response = await staffApi.getAllStaff({
        limit: itemsPerPage,
        offset,
      });
      if (response.success) {
        setUsers(response.data || []);
        setTotalItems((response as any).total || response.data?.length || 0);
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (itemsPerPage: number) => {
    setItemsPerPage(itemsPerPage);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const loadStores = async () => {
    try {
      setLoadingStores(true);
      const response = await storeApi.getAllStores();
      if (response.success && response.data) {
        setStores(response.data);
      }
    } catch (error) {
      console.error("Error loading stores:", error);
    } finally {
      setLoadingStores(false);
    }
  };

  const loadStoresForOwnerOrManager = async () => {
    try {
      setLoadingStores(true);
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const token = localStorage.getItem('staff_auth_token');
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const staffResponse = await fetch(`${apiUrl}/api/staff/me`, {
        headers,
        credentials: "include",
      });

      if (!staffResponse.ok) {
        console.error("Failed to fetch staff info");
        return;
      }

      const staffData = await staffResponse.json();
      if (!staffData.success || !staffData.user) {
        console.error("Failed to get staff info");
        return;
      }

      const userStoreId = (staffData.user as any).storeId;

      if (!userStoreId) {
        setStores([]);
        return;
      }

      const response = await storeApi.getAllStores();
      if (response.success && response.data) {
        const filteredStores = response.data.filter((store) => store.id === userStoreId);
        setStores(filteredStores);

        if (filteredStores.length === 1) {
          setRegisterFormData((prev) => ({
            ...prev,
            storeId: filteredStores[0].id,
          }));
        }
      }
    } catch (error) {
      console.error("Error loading stores for owner/manager:", error);
    } finally {
      setLoadingStores(false);
    }
  };

  const getInitialRole = (): RegisterFormData["role"] => {
    if (currentUser?.role === "admin") {
      return "owner";
    } else if (currentUser?.role === "owner") {
      return "employee";
    }
    return "employee";
  };

  const getAvailableRoles = (): RegisterFormData["role"][] => {
    if (currentUser?.role === "admin") {
      return ["owner"];
    } else if (currentUser?.role === "owner") {
      return ["manager", "employee"];
    } else if (currentUser?.role === "manager") {
      return ["employee"];
    }
    return [];
  };

  const handleRegisterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setRegisterFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setRegisterError("");
    setRegisterSuccess("");
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setRegisterError("");
    setRegisterSuccess("");

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const token = localStorage.getItem('staff_auth_token');
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      // Add Bearer token if available (fallback when cookies don't work)
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await fetch(`${apiUrl}/api/staff/invite`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          email: registerFormData.email,
          firstName: registerFormData.firstName,
          lastName: registerFormData.lastName,
          role: registerFormData.role,
          department: registerFormData.department || undefined,
          employeeId: registerFormData.employeeId || undefined,
          storeId: registerFormData.storeId || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRegisterSuccess(
          t("registerStaff.feedback.success", { email: registerFormData.email })
        );
        showSuccess(t("registerStaff.feedback.success", { email: registerFormData.email }));
        const resetStoreId =
          currentUser?.role !== "admin" && stores.length === 1
            ? stores[0].id
            : "";
        setRegisterFormData({
          email: "",
          firstName: "",
          lastName: "",
          role: getInitialRole(),
          department: "",
          employeeId: "",
          storeId: resetStoreId,
        });
        loadUsers();
        setTimeout(() => {
          setShowRegisterForm(false);
          setRegisterSuccess("");
        }, 2000);
      } else {
        setRegisterError(data.message || t("registerStaff.feedback.error"));
        showError(data.message || t("registerStaff.feedback.error"));
      }
    } catch (err: any) {
      const errorMsg = err.message || t("registerStaff.feedback.unexpected");
      setRegisterError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsSubmitting(false);
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

  const canRegisterStaff =
    currentUser &&
    (currentUser.role === "admin" ||
      currentUser.role === "owner" ||
      currentUser.role === "manager");

  // Set header actions - must be before early return to maintain hook order
  useEffect(() => {
    if (canRegisterStaff) {
      const handleToggleRegister = () => {
        setShowRegisterForm(!showRegisterForm);
        if (!showRegisterForm) {
          setRegisterFormData((prev) => ({
            ...prev,
            role: getInitialRole(),
          }));
        }
      };

      setHeaderActions(
        <button
          onClick={handleToggleRegister}
          className={`btn ${showRegisterForm ? "btn-secondary" : "btn-primary"}`}
        >
          {showRegisterForm ? (
            <>
              <X className="w-4 h-4 mr-2" />
              {t("users.actions.cancelRegister") || "Cancel"}
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              {t("users.actions.registerStaff") || "Register Staff"}
            </>
          )}
        </button>
      );
    } else {
      setHeaderActions(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRegisterStaff, showRegisterForm, setHeaderActions, t]);

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

      {showRegisterForm && canRegisterStaff && (
        <div className="card">
          <div className={styles.registerHeader}>
            <h3 className={styles.registerTitle}>
              {t("registerStaff.title") || "Invite New Staff"}
            </h3>
            <p className={styles.registerSubtitle}>
              {t("registerStaff.subtitle") || "Send an invitation to a new staff member"}
            </p>
          </div>

          <form onSubmit={handleRegisterSubmit} className={styles.registerForm}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="firstName">
                  {t("registerStaff.form.firstName")}
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="form-input"
                  placeholder={t("registerStaff.form.firstNamePlaceholder")}
                  value={registerFormData.firstName}
                  onChange={handleRegisterChange}
                  disabled={isSubmitting}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="lastName">
                  {t("registerStaff.form.lastName")}
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className="form-input"
                  placeholder={t("registerStaff.form.lastNamePlaceholder")}
                  value={registerFormData.lastName}
                  onChange={handleRegisterChange}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="email">
                {t("registerStaff.form.email")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="form-input"
                placeholder={t("registerStaff.form.emailPlaceholder")}
                value={registerFormData.email}
                onChange={handleRegisterChange}
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="role">
                  {t("registerStaff.form.role")}
                </label>
                <select
                  id="role"
                  name="role"
                  required
                  className="form-input form-select"
                  value={registerFormData.role}
                  onChange={handleRegisterChange}
                  disabled={isSubmitting}
                >
                  {getAvailableRoles().map((role) => (
                    <option key={role} value={role}>
                      {t(`registerStaff.form.roles.${role}`)}
                    </option>
                  ))}
                </select>
              </div>
              {(currentUser?.role === "admin" ||
                currentUser?.role === "owner" ||
                currentUser?.role === "manager") && (
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="storeId">
                    {t("registerStaff.form.store")}
                    {currentUser?.role === "admin" && (
                      <span className={styles.optional}>
                        {t("registerStaff.form.optional")}
                      </span>
                    )}
                  </label>
                  <select
                    id="storeId"
                    name="storeId"
                    className="form-input form-select"
                    value={registerFormData.storeId}
                    onChange={handleRegisterChange}
                    disabled={
                      isSubmitting ||
                      loadingStores ||
                      (currentUser?.role !== "admin" && stores.length === 1)
                    }
                  >
                    <option value="">
                      {loadingStores
                        ? t("registerStaff.form.loadingStores")
                        : t("registerStaff.form.selectStore")}
                    </option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="department">
                  {t("registerStaff.form.department")}
                  <span className={styles.optional}>
                    {t("registerStaff.form.optional")}
                  </span>
                </label>
                <input
                  id="department"
                  name="department"
                  type="text"
                  className="form-input"
                  placeholder={t("registerStaff.form.departmentPlaceholder")}
                  value={registerFormData.department}
                  onChange={handleRegisterChange}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="employeeId">
                {t("registerStaff.form.employeeId")}
                <span className={styles.optional}>
                  {t("registerStaff.form.optional")}
                </span>
              </label>
              <input
                id="employeeId"
                name="employeeId"
                type="text"
                className="form-input"
                placeholder={t("registerStaff.form.employeeIdPlaceholder")}
                value={registerFormData.employeeId}
                onChange={handleRegisterChange}
                disabled={isSubmitting}
              />
            </div>

            {registerError && (
              <div className={styles.errorMessage} role="alert">
                {registerError}
              </div>
            )}

            {registerSuccess && (
              <div className={styles.successMessage} role="status">
                {registerSuccess}
              </div>
            )}

            <div className={styles.registerActions}>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
              >
                {isSubmitting
                  ? t("registerStaff.form.sending")
                  : t("registerStaff.form.submit")}
              </button>
            </div>

            <p className={styles.registerFooter}>
              {t("registerStaff.form.info")}
            </p>
          </form>
        </div>
      )}

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
                        disabled={!user.canEdit && user.id !== currentUser?.id}
                        style={{ 
                          opacity: (user.canEdit || user.id === currentUser?.id) ? 1 : 0.5, 
                          cursor: (user.canEdit || user.id === currentUser?.id) ? 'pointer' : 'not-allowed' 
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {user.canEdit && currentUser?.role === "admin" &&
                        user.id !== currentUser.id && (
                        <button
                          onClick={() => {
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
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
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

