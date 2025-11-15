import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Edit2, Trash2, Search, Filter } from "lucide-react";
import { categoryApi, type Category } from "../../services/api";
import { useNotification } from "../../contexts/NotificationContext";
import CategoryModal from "./CategoryModal";
import styles from "./CategoriesManagement.module.css";

const CategoriesManagement: React.FC = () => {
  const { t } = useTranslation();
  const { showSuccess, showError, showWarning } = useNotification();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await categoryApi.getCategoryTree({
        includeInactive: false,
      });
      if (response.success && response.data) {
        // Flatten the tree structure for display
        const flattenCategories = (cats: Category[]): Category[] => {
          const result: Category[] = [];
          for (const cat of cats) {
            result.push(cat);
            if (cat.children && Array.isArray(cat.children) && cat.children.length > 0) {
              result.push(...flattenCategories(cat.children));
            }
          }
          return result;
        };
        setCategories(flattenCategories(response.data));
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      showError(t("categories.error.loadFailed") || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedCategory(null);
    setIsModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const handleDelete = async (category: Category) => {
    if (!window.confirm(t("categories.confirm.delete", { name: category.name }) || `Are you sure you want to delete "${category.name}"?`)) {
      return;
    }

    try {
      setDeletingId(category.id);
      const response = await categoryApi.deleteCategory(category.id);
      if (response.success) {
        showSuccess(t("categories.success.deleted") || "Category deleted successfully");
        loadCategories();
      } else {
        showError(response.message || t("categories.error.deleteFailed") || "Failed to delete category");
      }
    } catch (error: any) {
      console.error("Error deleting category:", error);
      const errorMessage = error.response?.data?.message || error.message || t("categories.error.deleteFailed") || "Failed to delete category";
      showError(errorMessage);
      if (errorMessage.includes("children")) {
        showWarning(t("categories.warning.hasChildren") || "Cannot delete category with children. Please delete or move children first.");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
  };

  const handleModalSave = () => {
    loadCategories();
    handleModalClose();
  };

  // Filter categories
  const filteredCategories = useMemo(() => {
    let filtered = categories;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (cat) =>
          cat.name.toLowerCase().includes(query) ||
          cat.slug.toLowerCase().includes(query) ||
          cat.description?.toLowerCase().includes(query)
      );
    }

    // Filter by level
    if (levelFilter !== null) {
      filtered = filtered.filter((cat) => cat.level === levelFilter);
    }

    return filtered;
  }, [categories, searchQuery, levelFilter]);

  const getIndentClass = (level: number) => {
    switch (level) {
      case 1:
        return "";
      case 2:
        return styles.level2;
      case 3:
        return styles.level3;
      default:
        return "";
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t("categories.title") || "Category Management"}</h1>
          <p className={styles.subtitle}>
            {t("categories.subtitle") || "Manage product categories and subcategories"}
          </p>
        </div>
        <button onClick={handleAdd} className={styles.addButton}>
          <Plus className={styles.icon} />
          {t("categories.actions.add") || "Add Category"}
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search className={styles.searchIcon} />
          <input
            type="text"
            placeholder={t("categories.search.placeholder") || "Search categories..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterBox}>
          <Filter className={styles.filterIcon} />
          <select
            value={levelFilter === null ? "" : levelFilter}
            onChange={(e) => setLevelFilter(e.target.value === "" ? null : parseInt(e.target.value))}
            className={styles.filterSelect}
          >
            <option value="">{t("categories.filter.allLevels") || "All Levels"}</option>
            <option value="1">{t("categories.filter.level1") || "Level 1 (Top Level)"}</option>
            <option value="2">{t("categories.filter.level2") || "Level 2 (Subcategory)"}</option>
            <option value="3">{t("categories.filter.level3") || "Level 3 (Sub-subcategory)"}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>{t("categories.loading") || "Loading categories..."}</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className={styles.empty}>
          <p>{t("categories.empty.noCategories") || "No categories found"}</p>
          {categories.length === 0 && (
            <button onClick={handleAdd} className={styles.addButton}>
              <Plus className={styles.icon} />
              {t("categories.actions.addFirst") || "Add First Category"}
            </button>
          )}
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("categories.table.name") || "Name"}</th>
                <th>{t("categories.table.slug") || "Slug"}</th>
                <th>{t("categories.table.level") || "Level"}</th>
                <th>{t("categories.table.parent") || "Parent"}</th>
                <th>{t("categories.table.status") || "Status"}</th>
                <th>{t("categories.table.actions") || "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((category) => (
                <tr key={category.id} className={getIndentClass(category.level)}>
                  <td>
                    <div className={styles.nameCell}>
                      <span className={styles.levelIndicator}>
                        {category.level === 1 ? "•" : category.level === 2 ? "  ••" : "    •••"}
                      </span>
                      {category.name}
                    </div>
                    {category.description && (
                      <div className={styles.description}>{category.description}</div>
                    )}
                  </td>
                  <td>
                    <code className={styles.slug}>{category.slug}</code>
                  </td>
                  <td>
                    <span className={styles.levelBadge}>Level {category.level}</span>
                  </td>
                  <td>
                    {category.parentId ? (
                      <span className={styles.parentName}>
                        {categories.find((c) => c.id === category.parentId)?.name || category.parentId}
                      </span>
                    ) : (
                      <span className={styles.noParent}>—</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${category.isActive ? styles.active : styles.inactive}`}
                    >
                      {category.isActive
                        ? t("categories.status.active") || "Active"
                        : t("categories.status.inactive") || "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        onClick={() => handleEdit(category)}
                        className={styles.editButton}
                        title={t("categories.actions.edit") || "Edit"}
                      >
                        <Edit2 className={styles.actionIcon} />
                      </button>
                      <button
                        onClick={() => handleDelete(category)}
                        className={styles.deleteButton}
                        disabled={deletingId === category.id}
                        title={t("categories.actions.delete") || "Delete"}
                      >
                        {deletingId === category.id ? (
                          <div className={styles.spinnerSmall}></div>
                        ) : (
                          <Trash2 className={styles.actionIcon} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <CategoryModal
          category={selectedCategory}
          allCategories={categories}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
};

export default CategoriesManagement;

