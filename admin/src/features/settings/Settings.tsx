import React, { useMemo, useState, useEffect } from "react";
import {
  Save,
  User,
  Bell,
  Shield,
  Globe,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme, type ThemeOption } from "../../contexts/ThemeContext";
import { useNotification } from "../../contexts/NotificationContext";
import { SUPPORTED_LANGUAGES } from "../../i18n/config";
import { staffApi } from "../../services/api";
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
  const { user, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const { showSuccess, showError } = useNotification();
  const initialLanguage = useMemo(() => {
    const lang = i18n.resolvedLanguage || i18n.language || "en";
    return lang.split("-")[0];
  }, [i18n.resolvedLanguage, i18n.language]);

  // Track original profile data for comparison
  const originalProfileData = useMemo(() => ({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phoneNumber: user?.phoneNumber || "",
  }), [user?.firstName, user?.lastName, user?.phoneNumber]);

  // Initialize profileData with user data if available
  const [profileData, setProfileData] = useState(() => ({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phoneNumber: user?.phoneNumber || "",
  }));
  const [savingProfile, setSavingProfile] = useState(false);

  // Sync profileData with originalProfileData when user data loads or updates
  // Only sync if profileData matches originalProfileData (no manual changes)
  useEffect(() => {
    if (user) {
      const newData = {
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phoneNumber: user.phoneNumber || "",
      };
      
      // Only sync if current data matches original (meaning no manual changes)
      const currentMatchesOriginal = (
        profileData.firstName === originalProfileData.firstName &&
        profileData.lastName === originalProfileData.lastName &&
        profileData.phoneNumber === originalProfileData.phoneNumber
      );
      
      if (currentMatchesOriginal) {
        setProfileData(newData);
      }
    }
  }, [user, originalProfileData]);

  // Check if profile data has changed
  const hasProfileChanges = useMemo(() => {
    if (!user) return false;
    return (
      profileData.firstName !== originalProfileData.firstName ||
      profileData.lastName !== originalProfileData.lastName ||
      profileData.phoneNumber !== originalProfileData.phoneNumber
    );
  }, [profileData, originalProfileData, user]);

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


  const languageOptions = useMemo(
    () =>
      SUPPORTED_LANGUAGES.map((lang) => ({
        value: lang,
        label: t(`languages.${lang}`),
      })),
    [t]
  );


  const handleResetProfile = () => {
    setProfileData(originalProfileData);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSavingProfile(true);
    try {
      // Only allow users to update their own basic information
      // Role, email, and other sensitive fields cannot be changed by the user
      const response = await staffApi.updateStaff(user.id, {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phoneNumber: profileData.phoneNumber,
        // Note: role is intentionally NOT included - users cannot change their own role
      });

      if (response.success) {
        showSuccess(t("settings.profile.updateSuccess"));
        // Refresh user data - this will update originalProfileData
        // The useEffect will then sync profileData if it matches originalProfileData
        if (refreshUser) {
          await refreshUser();
        }
      } else {
        showError(response.message || t("settings.profile.updateError"));
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      showError(error?.message || t("settings.profile.updateError"));
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className={styles.container}>
      <section className="card">
        <div className={styles.profileHeader}>
          <div className={styles.sectionHeader}>
            <User className="w-5 h-5 text-gray-600" />
            <h3 className={styles.sectionTitle}>{t("settings.profile.title")}</h3>
          </div>
          <div className={styles.profileActions}>
            <button
              onClick={handleSaveProfile}
              disabled={!hasProfileChanges || savingProfile}
              className="btn btn-primary btn-sm"
              title={t("settings.profile.actions.save")}
            >
              {savingProfile ? (
                <>
                  <span className={styles.spinner} aria-hidden />
                  {t("settings.profile.actions.saving")}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {t("settings.profile.actions.save")}
                </>
              )}
            </button>
            <button
              onClick={handleResetProfile}
              disabled={!hasProfileChanges || savingProfile}
              className="btn btn-secondary btn-sm"
              title={t("settings.profile.actions.cancel")}
            >
              <X className="w-4 h-4 mr-2" />
              {t("settings.profile.actions.cancel")}
            </button>
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
                value={profileData.firstName}
                onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="lastName">
                {t("settings.profile.lastName")}
              </label>
              <input
                id="lastName"
                type="text"
                value={profileData.lastName}
                onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                className={styles.input}
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="phoneNumber">
              {t("settings.profile.phoneNumber")}
            </label>
            <input
              id="phoneNumber"
              type="tel"
              value={profileData.phoneNumber}
              onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
              className={styles.input}
            />
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
              className={styles.select}
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

    </div>
  );
};

export default Settings;

