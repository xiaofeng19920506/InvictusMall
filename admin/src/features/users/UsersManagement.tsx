import React, { useEffect } from "react";
import { Users, Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { useAdminHeader } from "../../shared/hooks/useAdminHeader";
import Pagination from "../../shared/components/Pagination";
import EditUserModal from "./EditUserModal";
import UserFilters from "./components/UserFilters";
import UserTable from "./components/UserTable";
import RegisterStaffForm from "./components/RegisterStaffForm";
import {
  useGetAllStaffQuery,
  useGetMyStoresQuery,
} from "../../store/api/staffApi";
import { useGetAllStoresQuery } from "../../store/api/storesApi";
import {
  setShowRegisterForm,
  setEditingUser,
  setCurrentPage,
  setItemsPerPage,
  setAccessibleStores,
} from "../../store/slices/usersSlice";
import styles from "./UsersManagement.module.css";

const UsersManagement: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { setHeaderActions } = useAdminHeader();

  const { currentPage, itemsPerPage, showRegisterForm, editingUser } =
    useAppSelector((state) => state.users);
  const currentUser = useAppSelector((state) => state.auth.user);

  // RTK Query hooks
  const {
    data: usersData,
    isLoading: loadingUsers,
    refetch: refetchUsers,
  } = useGetAllStaffQuery({
    limit: itemsPerPage,
    offset: (currentPage - 1) * itemsPerPage,
  });

  const { data: myStores, isLoading: loadingStores } = useGetMyStoresQuery(
    undefined,
    {
      skip: currentUser?.role === "admin", // Skip for admin, they use getAllStores
    }
  );

  // For admin, fetch all stores
  const { data: allStores } = useGetAllStoresQuery(undefined, {
    skip: currentUser?.role !== "admin",
  });

  const users = usersData?.staff || [];
  const totalItems = usersData?.total || 0;
  const loading = loadingUsers || loadingStores;

  // Update accessible stores in Redux
  useEffect(() => {
    const stores =
      currentUser?.role === "admin" ? allStores || [] : myStores || [];
    if (stores.length > 0) {
      dispatch(setAccessibleStores(stores));
    }
  }, [dispatch, allStores, myStores, currentUser?.role]);

  // Set header actions
  useEffect(() => {
    const canRegisterStaff =
      currentUser &&
      (currentUser.role === "admin" ||
        currentUser.role === "owner" ||
        currentUser.role === "manager");

    if (canRegisterStaff) {
      const handleToggleRegister = () => {
        dispatch(setShowRegisterForm(!showRegisterForm));
      };

      setHeaderActions(
        <button
          onClick={handleToggleRegister}
          className={`btn ${
            showRegisterForm ? "btn-secondary" : "btn-primary"
          }`}
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
  }, [canRegisterStaff, showRegisterForm, setHeaderActions, t, dispatch]);

  const handlePageChange = (page: number) => {
    dispatch(setCurrentPage(page));
  };

  const handleItemsPerPageChange = (itemsPerPage: number) => {
    dispatch(setItemsPerPage(itemsPerPage));
  };

  const handleEditUser = (user: any) => {
    dispatch(setEditingUser(user));
  };

  const handleCloseEditModal = () => {
    dispatch(setEditingUser(null));
  };

  const handleSaveUser = () => {
    refetchUsers();
    dispatch(setEditingUser(null));
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Calculate filtered users count for display
  const { searchTerm, filterRole, selectedStoreId } = useAppSelector(
    (state) => state.users
  );
  const filteredUsersCount = users.filter((user) => {
    if (user.id === currentUser?.id) return false;
    if (selectedStoreId !== "all") {
      const userStoreId = (user as any).storeId;
      if (userStoreId !== selectedStoreId) return false;
    }
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      user.phoneNumber.includes(searchTerm);
    const matchesFilter = filterRole === "all" || user.role === filterRole;
    return matchesSearch && matchesFilter;
  }).length;
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009

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
<<<<<<< HEAD

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
                    <span className={styles.optional}>
                      {t("registerStaff.form.optional")}
                    </span>
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

      <RegisterStaffForm />

      <div className="card">
        <UserFilters />
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            {t("users.table.title", { count: filteredUsersCount })}
          </h3>
        </div>

        <UserTable onEdit={handleEditUser} />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      </div>

      {filteredUsersCount === 0 && (
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
          onClose={handleCloseEditModal}
          onSave={handleSaveUser}
        />
      )}
    </div>
  );
};

export default UsersManagement;
