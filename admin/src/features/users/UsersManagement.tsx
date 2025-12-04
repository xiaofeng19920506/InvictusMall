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
  }, [currentUser, showRegisterForm, setHeaderActions, t, dispatch]);

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
