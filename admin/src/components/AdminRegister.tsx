import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import type { User } from "../services/auth";
import styles from "./AdminRegister.module.css";

interface RegisterFormData {
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "owner" | "manager" | "employee";
  department: string;
  employeeId: string;
}

function buildRoleLabel(role: RegisterFormData["role"], t: (key: string) => string) {
  return t(`registerStaff.form.roles.${role}`);
}

export default function AdminRegister() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [formData, setFormData] = useState<RegisterFormData>({
    email: "",
    firstName: "",
    lastName: "",
    role: "employee",
    department: "",
    employeeId: "",
  });
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("http://localhost:3001/api/staff/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          department: formData.department || undefined,
          employeeId: formData.employeeId || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(
          t("registerStaff.feedback.success", { email: formData.email })
        );
        setFormData({
          email: "",
          firstName: "",
          lastName: "",
          role: "employee",
          department: "",
          employeeId: "",
        });
      } else {
        setError(data.message || t("registerStaff.feedback.error"));
      }
    } catch (err: any) {
      setError(err.message || t("registerStaff.feedback.unexpected"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || (user.role !== "admin" && user.role !== "owner")) {
    return (
      <div className={styles.container}>
        <div className={`${styles.card} ${styles.accessDenied}`}>
          <div className={styles.icon} aria-hidden>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className={styles.title}>{t("registerStaff.accessDenied.title")}</h2>
          <p className={styles.subtitle}>
            {t("registerStaff.accessDenied.message")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <header className={styles.header}>
          <div className={styles.icon} aria-hidden>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
              />
            </svg>
          </div>
          <h2 className={styles.title}>{t("registerStaff.title")}</h2>
          <p className={styles.subtitle}>{t("registerStaff.subtitle")}</p>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.gridTwo}>
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="firstName">
                {t("registerStaff.form.firstName")}
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                className={styles.input}
                placeholder={t("registerStaff.form.firstNamePlaceholder")}
                value={formData.firstName}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="lastName">
                {t("registerStaff.form.lastName")}
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                className={styles.input}
                placeholder={t("registerStaff.form.lastNamePlaceholder")}
                value={formData.lastName}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="email">
              {t("registerStaff.form.email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className={styles.input}
              placeholder={t("registerStaff.form.emailPlaceholder")}
              value={formData.email}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.gridTwo}>
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="role">
                {t("registerStaff.form.role")}
              </label>
              <select
                id="role"
                name="role"
                required
                className={styles.select}
                value={formData.role}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                {(["employee", "manager", "owner", "admin"] as RegisterFormData["role"][]).map(
                  (role) => (
                    <option key={role} value={role}>
                      {buildRoleLabel(role, t)}
                    </option>
                  )
                )}
              </select>
            </div>
            <div className={styles.inputGroup}>
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
                className={styles.input}
                placeholder={t("registerStaff.form.departmentPlaceholder")}
                value={formData.department}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
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
              className={styles.input}
              placeholder={t("registerStaff.form.employeeIdPlaceholder")}
              value={formData.employeeId}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className={styles.error} role="alert">
              <svg className={styles.alertIcon} viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3a1 1 0 102 0V7zm-1 5a1.25 1.25 0 100 2.5A1.25 1.25 0 0010 12z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className={styles.success} role="status">
              <svg className={styles.alertIcon} viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 10-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{success}</span>
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className={styles.button}>
            {isSubmitting ? (
              <span className={styles.buttonText}>
                <span className={styles.spinner} aria-hidden />
                {t("registerStaff.form.sending")}
              </span>
            ) : (
              t("registerStaff.form.submit")
            )}
          </button>

          <p className={styles.footer}>{t("registerStaff.form.info")}</p>
        </form>
      </div>
    </div>
  );
}
