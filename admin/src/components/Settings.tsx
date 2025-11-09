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
import { useAuth } from "../contexts/AuthContext";

const languageOptions = [
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "ko", label: "한국어" },
  { value: "ja", label: "日本語" },
];

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const initialLanguage = useMemo(() => {
    const lang = i18n.resolvedLanguage || i18n.language || "en";
    return lang.split("-")[0];
  }, [i18n.resolvedLanguage, i18n.language]);
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: false,
      sms: false
    },
    preferences: {
      theme: 'light',
      language: initialLanguage,
      timezone: 'UTC'
    },
    security: {
      twoFactor: false,
      sessionTimeout: 30
    }
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Settings saved successfully!');
    } catch (error) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your account settings and preferences</p>
      </div>

      {/* Profile Section */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-gray-600" />
            <h3 className="card-title">Profile Information</h3>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input
                type="text"
                defaultValue={user?.firstName}
                className="form-input"
                disabled
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input
                type="text"
                defaultValue={user?.lastName}
                className="form-input"
                disabled
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              defaultValue={user?.email}
              className="form-input"
              disabled
            />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <input
              type="text"
              defaultValue={user?.role.toUpperCase()}
              className="form-input"
              disabled
            />
          </div>
          <p className="text-sm text-gray-500">
            Profile information can be updated through your account settings.
          </p>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-600" />
            <h3 className="card-title">Notifications</h3>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="form-label">Email Notifications</label>
              <p className="text-sm text-gray-500">Receive email notifications for important updates</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.email}
                onChange={(e) => setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, email: e.target.checked }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="form-label">Push Notifications</label>
              <p className="text-sm text-gray-500">Receive push notifications in your browser</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.push}
                onChange={(e) => setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, push: e.target.checked }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="form-label">SMS Notifications</label>
              <p className="text-sm text-gray-500">Receive SMS notifications for critical alerts</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.sms}
                onChange={(e) => setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, sms: e.target.checked }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-gray-600" />
            <h3 className="card-title">Preferences</h3>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="form-group">
            <label className="form-label">Theme</label>
            <select
              value={settings.preferences.theme}
              onChange={(e) => setSettings({
                ...settings,
                preferences: { ...settings.preferences, theme: e.target.value }
              })}
              className="form-input form-select"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Language</label>
            <select
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
              className="form-input form-select"
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Timezone</label>
            <select
              value={settings.preferences.timezone}
              onChange={(e) => setSettings({
                ...settings,
                preferences: { ...settings.preferences, timezone: e.target.value }
              })}
              className="form-input form-select"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Asia/Shanghai">China Standard Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-600" />
            <h3 className="card-title">Security</h3>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="form-label">Two-Factor Authentication</label>
              <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.security.twoFactor}
                onChange={(e) => setSettings({
                  ...settings,
                  security: { ...settings.security, twoFactor: e.target.checked }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="form-group">
            <label className="form-label">Session Timeout (minutes)</label>
            <input
              type="number"
              min="5"
              max="120"
              value={settings.security.sessionTimeout}
              onChange={(e) => setSettings({
                ...settings,
                security: { ...settings.security, sessionTimeout: parseInt(e.target.value) }
              })}
              className="form-input"
            />
            <p className="text-sm text-gray-500 mt-1">
              Automatically log out after inactivity period
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default Settings;

