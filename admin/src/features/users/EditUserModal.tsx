import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNotification } from "../../contexts/NotificationContext";
import { staffApi, type Staff, type UpdateStaffRequest } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./EditUserModal.module.css";

export interface EditUserModalProps {
  user: Staff | null;
  onClose: () => void;
  onSave: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onSave }) => {
  const { t } = useTranslation();
  const { showError, showSuccess } = useNotification();
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState<UpdateStaffRequest>({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    role: "employee",
    department: "",
    employeeId: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phoneNumber: user.phoneNumber || "",
        role: user.role,
        department: user.department || "",
        employeeId: user.employeeId || "",
      });
    }
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      // Build update data with only changed fields
      const updateData: UpdateStaffRequest = {};
      
      // Helper to normalize empty strings and undefined to empty string for comparison
      const normalize = (value: string | undefined | null): string => value || "";
      
      // Compare each field and only include if changed
      if (formData.firstName !== normalize(user.firstName)) {
        updateData.firstName = formData.firstName;
      }
      if (formData.lastName !== normalize(user.lastName)) {
        updateData.lastName = formData.lastName;
      }
      if (formData.phoneNumber !== normalize(user.phoneNumber)) {
        updateData.phoneNumber = formData.phoneNumber;
      }
      if (formData.role !== user.role && !isSelf) {
        // Only include role if changed and user has permission (not self)
        updateData.role = formData.role;
      }
      // For department, compare normalized values
      if (normalize(formData.department) !== normalize(user.department)) {
        updateData.department = formData.department || undefined;
      }
      if (formData.isActive !== undefined && formData.isActive !== user.isActive) {
        // Only include isActive if changed
        updateData.isActive = formData.isActive;
      }

      // Don't send update if nothing changed
      if (Object.keys(updateData).length === 0) {
        showSuccess(t("users.edit.noChanges") || "No changes to save");
        onClose();
        return;
      }

      const response = await staffApi.updateStaff(user.id, updateData);
      if (response.success) {
        showSuccess(t("users.edit.success") || "User updated successfully");
        onSave();
        onClose();
      } else {
        showError(response.message || t("users.edit.error") || "Failed to update user");
      }
    } catch (error: any) {
      console.error("Error updating user:", error);
      showError(
        error.response?.data?.message ||
          t("users.edit.error") ||
          "Failed to update user"
      );
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const isSelf = currentUser?.id === user.id;

  // Get available roles based on current user's role
  const getAvailableRoles = (): Staff["role"][] => {
    if (isSelf) {
      // Users cannot change their own role
      return [user.role];
    }
    if (currentUser?.role === "admin") {
      return ["admin", "owner", "manager", "employee"];
    } else if (currentUser?.role === "owner") {
      return ["manager", "employee"]; // Owner cannot change to admin or owner
    } else if (currentUser?.role === "manager") {
      return ["manager", "employee"]; // Manager cannot change to admin or owner
    }
    return [];
  };

  const availableRoles = getAvailableRoles();
  const canChangeRole = !isSelf && (
    currentUser?.role === "admin" || 
    (currentUser?.role === "owner" && user.role !== "owner") ||
    (currentUser?.role === "manager" && user.role !== "owner" && user.role !== "admin")
  );

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{t("users.edit.title") || "Edit User"}</h3>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            <X className={styles.closeIcon} />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="email">
              {t("users.edit.email") || "Email"}
            </label>
            <input
              id="email"
              type="email"
              value={user.email}
              className={styles.input}
              disabled
            />
            <p className={styles.helpText}>
              {t("users.edit.emailHelp") || "Email cannot be changed"}
            </p>
          </div>

          <div className={styles.gridTwo}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="firstName">
                {t("users.edit.firstName") || "First Name"}
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                className={styles.input}
                value={formData.firstName}
                onChange={handleChange}
                disabled={saving}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="lastName">
                {t("users.edit.lastName") || "Last Name"}
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                className={styles.input}
                value={formData.lastName}
                onChange={handleChange}
                disabled={saving}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="phoneNumber">
              {t("users.edit.phoneNumber") || "Phone Number"}
            </label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              required
              className={styles.input}
              value={formData.phoneNumber}
              onChange={handleChange}
              disabled={saving}
            />
          </div>

          <div className={styles.gridTwo}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="role">
                {t("users.edit.role") || "Role"}
              </label>
              <select
                id="role"
                name="role"
                required
                className={styles.select}
                value={formData.role}
                onChange={handleChange}
                disabled={saving || !canChangeRole}
              >
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {t(`users.roles.${role}`, {
                      defaultValue: role.toUpperCase(),
                    })}
                  </option>
                ))}
              </select>
              {!canChangeRole && (
                <p className={styles.helpText}>
                  {t("users.edit.roleHelp") || "You cannot change this user's role"}
                </p>
              )}
            </div>

            {currentUser?.role === "admin" && !isSelf && (
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="isActive">
                  {t("users.edit.status") || "Status"}
                </label>
                <select
                  id="isActive"
                  name="isActive"
                  className={styles.select}
                  value={user.isActive ? "active" : "inactive"}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      isActive: e.target.value === "active",
                    }));
                  }}
                  disabled={saving}
                >
                  <option value="active">
                    {t("users.status.active") || "Active"}
                  </option>
                  <option value="inactive">
                    {t("users.status.inactive") || "Inactive"}
                  </option>
                </select>
              </div>
            )}
          </div>

          <div className={styles.gridTwo}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="department">
                {t("users.edit.department") || "Department"}
                <span className={styles.optional}>
                  {t("users.edit.optional") || " (optional)"}
                </span>
              </label>
              <input
                id="department"
                name="department"
                type="text"
                className={styles.input}
                value={formData.department}
                onChange={handleChange}
                disabled={saving}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="employeeId">
                {t("users.edit.employeeId") || "Employee ID"}
                <span className={styles.optional}>
                  {t("users.edit.optional") || " (optional)"}
                </span>
              </label>
              <input
                id="employeeId"
                name="employeeId"
                type="text"
                className={styles.input}
                value={formData.employeeId}
                onChange={handleChange}
                disabled={true}
              />
              <p className={styles.helpText}>
                {t("users.edit.employeeIdHelp") || "Employee ID cannot be changed"}
              </p>
            </div>
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              className={`${styles.button} ${styles.cancelButton}`}
              onClick={onClose}
              disabled={saving}
            >
              {t("users.edit.cancel") || "Cancel"}
            </button>
            <button
              type="submit"
              className={`${styles.button} ${styles.saveButton}`}
              disabled={saving}
            >
              {saving
                ? t("users.edit.saving") || "Saving..."
                : t("users.edit.save") || "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;

