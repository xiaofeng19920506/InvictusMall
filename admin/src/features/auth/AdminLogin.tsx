import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import type { LoginRequest } from "../../services/auth";
import styles from "./AdminLogin.module.css";

export default function AdminLogin() {
  const { login, loading } = useAuth();
  const { t } = useTranslation();
  const [formData, setFormData] = useState<LoginRequest>({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await login(formData);
      if (!response.success) {
        setError(response.message || t("adminLogin.errors.loginFailed"));
      }
    } catch (err: any) {
      setError(err?.message || t("adminLogin.errors.unexpected"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingSpinner} aria-hidden />
          <p className={styles.loadingText}>{t("adminLogin.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <div className={styles.icon} aria-hidden>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className={styles.title}>{t("adminLogin.title")}</h2>
          <p className={styles.subtitle}>{t("adminLogin.subtitle")}</p>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={styles.input}
              placeholder={t("adminLogin.form.emailPlaceholder")}
              value={formData.email}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.inputGroup}>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={styles.input}
              placeholder={t("adminLogin.form.passwordPlaceholder")}
              value={formData.password}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className={styles.error} role="alert">
              <svg className={styles.errorIcon} viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-11a1 1 0 112 0v3a1 1 0 11-2 0V7zm1 5a1.25 1.25 0 100 2.5A1.25 1.25 0 0010 12z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
            {isSubmitting ? (
              <>
                <span className={styles.spinner} aria-hidden />
                {t("adminLogin.actions.signingIn")}
              </>
            ) : (
              t("adminLogin.actions.submit")
            )}
          </button>

          <p className={styles.footer}>{t("adminLogin.footer")}</p>
        </form>
      </div>
    </div>
  );
}
