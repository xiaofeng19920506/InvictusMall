import React from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector, useAppDispatch } from "../../../store/hooks";
import {
  setShowRegisterForm,
  setRegisterFormData,
  setRegisterError,
  setRegisterSuccess,
  setSubmitting,
} from "../../../store/slices/usersSlice";
import { useNotification } from "../../../contexts/NotificationContext";
import { fetchUsers } from "../../../store/slices/usersSlice";
import styles from "../UsersManagement.module.css";

const RegisterStaffForm: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { showError, showSuccess } = useNotification();
  const showRegisterForm = useAppSelector(
    (state) => state.users.showRegisterForm
  );
  const registerFormData = useAppSelector(
    (state) => state.users.registerFormData
  );
  const registerError = useAppSelector((state) => state.users.registerError);
  const registerSuccess = useAppSelector(
    (state) => state.users.registerSuccess
  );
  const isSubmitting = useAppSelector((state) => state.users.submitting);
  const loadingStores = useAppSelector((state) => state.users.loadingStores);
  const accessibleStores = useAppSelector(
    (state) => state.users.accessibleStores
  );
  const currentUser = useAppSelector((state) => state.auth.user);

  const getAvailableRoles = (): Array<
    "admin" | "owner" | "manager" | "employee"
  > => {
    if (currentUser?.role === "admin") {
      return ["admin", "owner", "manager", "employee"];
    } else if (currentUser?.role === "owner") {
      return ["manager", "employee"];
    } else if (currentUser?.role === "manager") {
      return ["employee"];
    }
    return [];
  };

  const getInitialRole = (): "admin" | "owner" | "manager" | "employee" => {
    return "employee";
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    dispatch(
      setRegisterFormData({
        [name]: value,
      } as any)
    );
    dispatch(setRegisterError(""));
    dispatch(setRegisterSuccess(""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setRegisterError(""));
    dispatch(setRegisterSuccess(""));
    dispatch(setSubmitting(true));

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const token = localStorage.getItem("staff_auth_token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

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
        const successMsg = t("registerStaff.feedback.success", {
          email: registerFormData.email,
        });
        dispatch(setRegisterSuccess(successMsg));
        showSuccess(successMsg);
        dispatch(fetchUsers({ limit: 20, offset: 0 }));
        const resetStoreId =
          currentUser?.role !== "admin" && accessibleStores.length === 1
            ? accessibleStores[0].id
            : "";
        dispatch(
          setRegisterFormData({
            email: "",
            firstName: "",
            lastName: "",
            role: getInitialRole(),
            department: "",
            employeeId: "",
            storeId: resetStoreId,
          })
        );
        setTimeout(() => {
          dispatch(setShowRegisterForm(false));
          dispatch(setRegisterSuccess(""));
        }, 2000);
      } else {
        const errorMsg = data.message || t("registerStaff.feedback.error");
        dispatch(setRegisterError(errorMsg));
        showError(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || t("registerStaff.feedback.unexpected");
      dispatch(setRegisterError(errorMsg));
      showError(errorMsg);
    } finally {
      dispatch(setSubmitting(false));
    }
  };

  if (!showRegisterForm) return null;

  return (
    <div className="card">
      <div className={styles.registerHeader}>
        <h3 className={styles.registerTitle}>
          {t("registerStaff.title") || "Invite New Staff"}
        </h3>
        <p className={styles.registerSubtitle}>
          {t("registerStaff.subtitle") ||
            "Send an invitation to a new staff member"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.registerForm}>
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
              onChange={handleChange}
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
              onChange={handleChange}
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
            onChange={handleChange}
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
              onChange={handleChange}
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
                onChange={handleChange}
                disabled={
                  isSubmitting ||
                  loadingStores ||
                  (currentUser?.role !== "admin" &&
                    accessibleStores.length === 1)
                }
              >
                <option value="">
                  {loadingStores
                    ? t("registerStaff.form.loadingStores")
                    : t("registerStaff.form.selectStore")}
                </option>
                {accessibleStores.map((store) => (
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
              onChange={handleChange}
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
            onChange={handleChange}
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

        <p className={styles.registerFooter}>{t("registerStaff.form.info")}</p>
      </form>
    </div>
  );
};

export default RegisterStaffForm;
