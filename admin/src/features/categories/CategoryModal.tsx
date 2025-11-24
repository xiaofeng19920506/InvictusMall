import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { categoryApi, type Category } from "../../services/api";
import { useNotification } from "../../contexts/NotificationContext";
import styles from "./CategoryModal.module.css";

export interface CategoryModalProps {
  category: Category | null;
  allCategories: Category[];
  onClose: () => void;
  onSave: () => void;
}

const CategoryModal: React.FC<CategoryModalProps> = ({
  category,
  allCategories,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const { showError, showSuccess } = useNotification();
  const isEditing = Boolean(category);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    parentId: "",
    displayOrder: 0,
    isActive: true,
  });

  const [saving, setSaving] = useState(false);
  const [loadingParentCategories, setLoadingParentCategories] = useState(false);
  const [parentCategories, setParentCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || "",
        slug: category.slug || "",
        description: category.description || "",
        parentId: category.parentId || "",
        displayOrder: category.displayOrder || 0,
        isActive: category.isActive ?? true,
      });
    }
    loadParentCategories();
  }, [category, allCategories]);

  const loadParentCategories = async () => {
    setLoadingParentCategories(true);
    try {
      // Get categories that can be parents (level 1 or 2, and not the current category or its descendants)
      let availableParents = allCategories.filter((cat) => {
        if (!cat.isActive) return false;
        if (cat.level >= 3) return false; // Level 3 can't have children (max 3 levels)
        if (isEditing && category) {
          if (cat.id === category.id) return false; // Can't be its own parent
          // Check if cat is a descendant of the current category
          let currentId = cat.parentId;
          while (currentId) {
            if (currentId === category.id) return false;
            const parent = allCategories.find((c) => c.id === currentId);
            if (!parent) break;
            currentId = parent.parentId;
          }
        }
        return true;
      });

      // If editing and current category has a parent, include it even if it would be filtered out
      if (isEditing && category && category.parentId) {
        const currentParent = allCategories.find((c) => c.id === category.parentId);
        if (currentParent && !availableParents.find((p) => p.id === currentParent.id)) {
          availableParents.push(currentParent);
        }
      }

      // Sort by level and name
      availableParents.sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        return a.name.localeCompare(b.name);
      });

      setParentCategories(availableParents);
    } catch (error) {
      console.error("Error loading parent categories:", error);
    } finally {
      setLoadingParentCategories(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : type === "number"
          ? parseInt(value) || 0
          : value,
    }));
  };

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name), // Auto-generate slug if empty
    }));
  };

  const parseSlugs = (slugInput: string): string[] => {
    return slugInput
      .trim()
      .split(/\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => generateSlug(s));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showError(t("categoryModal.error.nameRequired") || "Category name is required");
      return;
    }

    setSaving(true);
    try {
      // Parse multiple slugs from space-separated input
      const slugInput = formData.slug.trim() || generateSlug(formData.name);
      const slugs = parseSlugs(slugInput);
      
      if (slugs.length === 0) {
        showError(t("categoryModal.error.slugRequired") || "At least one slug is required");
        setSaving(false);
        return;
      }

      const data = {
        name: formData.name.trim(),
        slug: slugs.join(" "), // Store as space-separated string
        description: formData.description.trim() || undefined,
        parentId: formData.parentId || undefined,
        displayOrder: formData.displayOrder,
        isActive: formData.isActive,
      };

      if (isEditing && category) {
        const response = await categoryApi.updateCategory(category.id, data);
        if (response.success) {
          showSuccess(t("categoryModal.success.updated") || "Category updated successfully");
          onSave();
        } else {
          showError(response.message || t("categoryModal.error.updateFailed") || "Failed to update category");
        }
      } else {
        const response = await categoryApi.createCategory(data);
        if (response.success) {
          showSuccess(t("categoryModal.success.created") || "Category created successfully");
          onSave();
        } else {
          showError(response.message || t("categoryModal.error.createFailed") || "Failed to create category");
        }
      }
    } catch (error: any) {
      console.error("Error saving category:", error);
      const errorMessage =
        error.response?.data?.message || error.message || t("categoryModal.error.saveFailed") || "Failed to save category";
      showError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const getMaxLevel = (): number => {
    if (!formData.parentId) return 1;
    const parent = allCategories.find((c) => c.id === formData.parentId);
    if (!parent) return 1;
    return parent.level + 1;
  };

  const maxLevel = getMaxLevel();
  const canHaveChildren = maxLevel < 3;

  return (
    <div className={styles.backdropContainer}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div className={styles.dialog} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h3 className={styles.title}>
            {isEditing ? t("categoryModal.editTitle") || "Edit Category" : t("categoryModal.createTitle") || "Create Category"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("categoryModal.actions.close") || "Close"}
            className={styles.closeButton}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={`${styles.content} custom-scrollbar`}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="name">
                {t("categoryModal.fields.name") || "Name"} <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleNameChange}
                className={styles.input}
                required
                placeholder={t("categoryModal.fields.namePlaceholder") || "Enter category name"}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="slug">
                {t("categoryModal.fields.slug") || "Slug"} <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="slug"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                className={styles.input}
                required
                placeholder={t("categoryModal.fields.slugPlaceholder") || "category-slug another-slug"}
              />
              <small className={styles.helpText}>
                {t("categoryModal.fields.slugHelp") || "URL-friendly identifier(s), separated by spaces (auto-generated from name if left empty)"}
              </small>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="description">
                {t("categoryModal.fields.description") || "Description"}
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className={`${styles.input} ${styles.textarea}`}
                rows={3}
                placeholder={t("categoryModal.fields.descriptionPlaceholder") || "Enter category description (optional)"}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="parentId">
                {t("categoryModal.fields.parent") || "Parent Category"}
              </label>
              <select
                id="parentId"
                name="parentId"
                value={formData.parentId}
                onChange={handleChange}
                className={styles.input}
                disabled={loadingParentCategories}
              >
                <option value="">
                  {loadingParentCategories
                    ? t("categoryModal.fields.loadingParents") || "Loading..."
                    : t("categoryModal.fields.noParent") || "— None (Top Level)"}
                </option>
                {parentCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.level === 1 ? cat.name : `  ${cat.name}`} (Level {cat.level})
                  </option>
                ))}
              </select>
              <small className={styles.helpText}>
                {formData.parentId
                  ? t("categoryModal.fields.parentHelpWithParent", { level: maxLevel }) || `This will be a Level ${maxLevel} category`
                  : t("categoryModal.fields.parentHelp") || "Select a parent category to create a subcategory"}
                {!canHaveChildren && formData.parentId && (
                  <span className={styles.warning}>
                    {" "}
                    ({t("categoryModal.warning.maxLevel") || "Maximum level (3) reached - cannot have children"})
                  </span>
                )}
              </small>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="displayOrder">
                {t("categoryModal.fields.displayOrder") || "Display Order"}
              </label>
              <input
                type="number"
                id="displayOrder"
                name="displayOrder"
                value={formData.displayOrder}
                onChange={handleChange}
                className={styles.input}
                min="0"
                placeholder="0"
              />
              <small className={styles.helpText}>
                {t("categoryModal.fields.displayOrderHelp") || "Lower numbers appear first (default: 0)"}
              </small>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.toggleRow}>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className={styles.checkbox}
                />
                <span>{t("categoryModal.fields.active") || "Active"}</span>
              </label>
              <small className={styles.helpText}>
                {t("categoryModal.fields.activeHelp") || "Inactive categories won't appear in selection dropdowns"}
              </small>
            </div>

            <div className={styles.actions}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving
                  ? t("categoryModal.actions.saving") || "Saving..."
                  : isEditing
                  ? t("categoryModal.actions.update") || "Update Category"
                  : t("categoryModal.actions.create") || "Create Category"}
              </button>
              <button type="button" onClick={onClose} className="btn btn-secondary" disabled={saving}>
                {t("categoryModal.actions.cancel") || "Cancel"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CategoryModal;

