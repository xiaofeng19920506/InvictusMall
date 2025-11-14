import React, { useMemo, useState } from "react";
import {
  Settings as SettingsIcon,
  Save,
  User,
  Bell,
  Shield,
  Globe,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme, type ThemeOption } from "../../contexts/ThemeContext";
import { useNotification } from "../../contexts/NotificationContext";
import { SUPPORTED_LANGUAGES } from "../../i18n/config";
import styles from "./Settings.module.css";

type TimezoneOption =
  | "UTC"
  | "America/New_York"
  | "America/Los_Angeles"
  | "Asia/Shanghai";

const timezoneOptions: TimezoneOption[] = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Shanghai",
];

const themeOptions: ThemeOption[] = ["light", "dark", "auto"];

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const { showSuccess, showError } = useNotification();
  const initialLanguage = useMemo(() => {
    const lang = i18n.resolvedLanguage || i18n.language || "en";
    return lang.split("-")[0];
  }, [i18n.resolvedLanguage, i18n.language]);

  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: false,
      sms: false,
    },
    preferences: {
      language: initialLanguage,
      timezone: "UTC" as TimezoneOption,
    },
    security: {
      twoFactor: false,
      sessionTimeout: 30,
    },
  });
  const [saving, setSaving] = useState(false);

  const languageOptions = useMemo(
    () =>
      SUPPORTED_LANGUAGES.map((lang) => ({
        value: lang,
        label: t(`languages.${lang}`),
      })),
    [t]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      showSuccess(t("settings.feedback.success"));
    } catch (error) {
      showError(t("settings.feedback.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2 className={styles.title}>{t("settings.title")}</h2>
        <p className={styles.subtitle}>{t("settings.subtitle")}</p>
      </header>

      <section className="card">
        <div className="card-header">
          <div className={styles.sectionHeader}>
            <User className="w-5 h-5 text-gray-600" />
            <h3 className={styles.sectionTitle}>{t("settings.profile.title")}</h3>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.gridTwo}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="firstName">
                {t("settings.profile.firstName")}
              </label>
              <input
                id="firstName"
                type="text"
                defaultValue={user?.firstName}
                className={styles.input}
                disabled
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="lastName">
                {t("settings.profile.lastName")}
              </label>
              <input
                id="lastName"
                type="text"
                defaultValue={user?.lastName}
                className={styles.input}
                disabled
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="email">
              {t("settings.profile.email")}
            </label>
            <input
              id="email"
              type="email"
              defaultValue={user?.email}
              className={styles.input}
              disabled
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>{t("settings.profile.role")}</label>
            <input
              type="text"
              defaultValue={user?.role?.toUpperCase()}
              className={`${styles.input} ${styles.roleValue}`}
              disabled
            />
          </div>
          <p className={styles.description}>{t("settings.profile.note")}</p>
        </div>
      </section>

      {/* Notifications section - temporarily hidden */}
      {false && (
        <section className="card">
          <div className="card-header">
            <div className={styles.sectionHeader}>
              <Bell className="w-5 h-5 text-gray-600" />
              <h3 className={styles.sectionTitle}>{t("settings.notifications.title")}</h3>
            </div>
          </div>
          <div className={styles.sectionBody}>
            <div className={styles.toggleRow}>
              <div>
                <label className={styles.label} htmlFor="emailNotifications">
                  {t("settings.notifications.email.title")}
                </label>
                <p className={styles.description}>
                  {t("settings.notifications.email.description")}
                </p>
              </div>
              <label className={styles.toggleSwitch} htmlFor="emailNotifications">
                <input
                  id="emailNotifications"
                  type="checkbox"
                  checked={settings.notifications.email}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        email: e.target.checked,
                      },
                    }))
                  }
                  className={styles.toggleInput}
                />
                <span className={styles.toggleSlider} aria-hidden />
              </label>
            </div>

            <div className={styles.toggleRow}>
              <div>
                <label className={styles.label} htmlFor="pushNotifications">
                  {t("settings.notifications.push.title")}
                </label>
                <p className={styles.description}>
                  {t("settings.notifications.push.description")}
                </p>
              </div>
              <label className={styles.toggleSwitch} htmlFor="pushNotifications">
                <input
                  id="pushNotifications"
                  type="checkbox"
                  checked={settings.notifications.push}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        push: e.target.checked,
                      },
                    }))
                  }
                  className={styles.toggleInput}
                />
                <span className={styles.toggleSlider} aria-hidden />
              </label>
            </div>

            <div className={styles.toggleRow}>
              <div>
                <label className={styles.label} htmlFor="smsNotifications">
                  {t("settings.notifications.sms.title")}
                </label>
                <p className={styles.description}>
                  {t("settings.notifications.sms.description")}
                </p>
              </div>
              <label className={styles.toggleSwitch} htmlFor="smsNotifications">
                <input
                  id="smsNotifications"
                  type="checkbox"
                  checked={settings.notifications.sms}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        sms: e.target.checked,
                      },
                    }))
                  }
                  className={styles.toggleInput}
                />
                <span className={styles.toggleSlider} aria-hidden />
              </label>
            </div>
          </div>
        </section>
      )}

      <section className="card">
        <div className="card-header">
          <div className={styles.sectionHeader}>
            <Globe className="w-5 h-5 text-gray-600" />
            <h3 className={styles.sectionTitle}>{t("settings.preferences.title")}</h3>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="theme">
              {t("settings.preferences.theme.title")}
            </label>
            <select
              id="theme"
              value={theme}
              onChange={(e) => {
                const newTheme = e.target.value as ThemeOption;
                setTheme(newTheme);
              }}
              className={styles.select}
            >
              {themeOptions.map((option) => (
                <option key={option} value={option}>
                  {t(`settings.preferences.theme.options.${option}`)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="language">
              {t("settings.preferences.language.title")}
            </label>
            <select
              id="language"
              value={settings.preferences.language}
              onChange={(e) => {
                const newLanguage = e.target.value;
                setSettings((prev) => ({
                  ...prev,
                  preferences: {
                    ...prev.preferences,
                    language: newLanguage,
                  },
                }));
                i18n.changeLanguage(newLanguage);
              }}
              className={styles.select}
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="timezone">
              {t("settings.preferences.timezone.title")}
            </label>
            <select
              id="timezone"
              value={settings.preferences.timezone}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  preferences: {
                    ...prev.preferences,
                    timezone: e.target.value as TimezoneOption,
                  },
                }))
              }
              className={`${styles.select} ${styles.timezoneOptions}`}
            >
              {timezoneOptions.map((option) => (
                <option key={option} value={option}>
                  {t(`settings.preferences.timezone.options.${option}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Security section - temporarily hidden */}
      {false && (
        <section className="card">
          <div className="card-header">
            <div className={styles.sectionHeader}>
              <Shield className="w-5 h-5 text-gray-600" />
              <h3 className={styles.sectionTitle}>{t("settings.security.title")}</h3>
            </div>
          </div>
          <div className={styles.sectionBody}>
            <div className={styles.toggleRow}>
              <div>
                <label className={styles.label} htmlFor="twoFactor">
                  {t("settings.security.twoFactor.title")}
                </label>
                <p className={styles.description}>
                  {t("settings.security.twoFactor.description")}
                </p>
              </div>
              <label className={styles.toggleSwitch} htmlFor="twoFactor">
                <input
                  id="twoFactor"
                  type="checkbox"
                  checked={settings.security.twoFactor}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      security: {
                        ...prev.security,
                        twoFactor: e.target.checked,
                      },
                    }))
                  }
                  className={styles.toggleInput}
                />
                <span className={styles.toggleSlider} aria-hidden />
              </label>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="sessionTimeout">
                {t("settings.security.sessionTimeout.title")}
              </label>
              <input
                id="sessionTimeout"
                type="number"
                min={5}
                max={120}
                value={settings.security.sessionTimeout}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    security: {
                      ...prev.security,
                      sessionTimeout: parseInt(e.target.value, 10),
                    },
                  }))
                }
                className={styles.input}
              />
              <p className={styles.description}>
                {t("settings.security.sessionTimeout.description")}
              </p>
            </div>
          </div>
        </section>
      )}

      <div className={styles.saveRow}>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`btn btn-primary ${styles.saveButton}`}
        >
          {saving ? <span className={styles.spinner} aria-hidden /> : <Save className="w-4 h-4" />}
          {saving ? t("settings.actions.saving") : t("settings.actions.save")}
        </button>
      </div>
    </div>
  );
};

export default Settings;

