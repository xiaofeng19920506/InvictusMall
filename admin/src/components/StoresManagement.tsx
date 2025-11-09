import React, { useEffect, useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Star,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { storeApi } from "../services/api";
import type { Store } from "../types/store";
import { useRealTimeStores } from "../hooks/useRealTimeStores";
import { useAuth } from "../contexts/AuthContext";
import { getImageUrl } from "../utils/imageUtils";
import StoreModal from "./StoreModal";
import styles from "./StoresManagement.module.css";

const StoresManagement: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [isClient, setIsClient] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setIsClient(typeof window !== "undefined");
  }, []);

  // Use real-time stores hook with 10-second refresh interval
  const { stores, loading, refetch, lastUpdated } = useRealTimeStores(10000);

  // Check if user is admin
  const isAdmin = user?.role === "admin";

  const handleDeleteStore = async (id: string) => {
    if (!window.confirm(t("stores.confirmDelete"))) {
      return;
    }

    try {
      await storeApi.deleteStore(id);
      refetch();
    } catch (error) {
      console.error("Error deleting store:", error);
      window.alert(t("stores.deleteError"));
    }
  };

  const handleVerifyStore = async (id: string) => {
    if (!window.confirm(t("stores.confirmVerify"))) {
      return;
    }

    try {
      await storeApi.verifyStore(id);
      refetch();
    } catch (error: any) {
      console.error("Error verifying store:", error);
      const errorMessage = error.response?.data?.message;
      if (errorMessage?.includes("Only administrators")) {
        window.alert(t("stores.verifyForbidden"));
      } else {
        window.alert(t("stores.verifyError"));
      }
    }
  };

  const handleEditStore = (store: Store) => {
    setEditingStore(store);
    setShowModal(true);
  };

  const handleAddStore = () => {
    setEditingStore(null);
    setShowModal(true);
  };

  const filteredStores = stores.filter((store) => {
    const matchesSearch =
      store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      !selectedCategory || store.category.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(
    new Set(stores.flatMap((store) => store.category))
  );

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="loading" />
        <span>{t("stores.loading")}</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h2 className={styles.title}>{t("stores.title")}</h2>
          {lastUpdated && (
            <p className={styles.lastUpdated}>
              🔄{" "}
              {t("stores.lastUpdated", {
                time: lastUpdated.toLocaleTimeString(),
              })}
              <span className={styles.pulseDot} aria-hidden="true" />
            </p>
          )}
        </div>
        <div className={styles.headerActions}>
          <button
            onClick={refetch}
            className="btn btn-secondary"
            disabled={loading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            {t("stores.refresh")}
          </button>
          <button onClick={handleAddStore} className="btn btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            {t("stores.addStore")}
          </button>
        </div>
      </div>

      <div className="card">
        <div className={styles.filters}>
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              placeholder={t("stores.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`form-input ${styles.searchInput}`}
            />
          </div>
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`form-input form-select ${styles.categorySelect}`}
            >
              <option value="">{t("stores.allCategories")}</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stores Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            {t("stores.table.title", { count: filteredStores.length })}
          </h3>
        </div>

        <div className={styles.tableWrapper}>
          <table className="table">
            <thead>
              <tr>
                <th>{t("stores.table.store")}</th>
                <th>{t("stores.table.category")}</th>
                <th>{t("stores.table.rating")}</th>
                <th>{t("stores.table.status")}</th>
                <th>{t("stores.table.products")}</th>
                <th>{t("stores.table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredStores.map((store) => (
                <tr key={store.id}>
                  <td>
                    <div className={styles.storeCell}>
                      <img
                        src={getImageUrl(store.imageUrl)}
                        alt={store.name}
                        className={styles.storeImage}
                      />
                      <div className={styles.storeInfo}>
                        <div className={styles.storeName}>{store.name}</div>
                        <div className={styles.storeDescription}>
                          {store.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className={styles.categoryPills}>
                      {store.category.slice(0, 2).map((cat, index) => (
                        <span key={index} className={styles.categoryPill}>
                          {cat}
                        </span>
                      ))}
                      {store.category.length > 2 && (
                        <span className={styles.extraCategories}>
                          +{store.category.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className={styles.ratingCell}>
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="font-medium">{store.rating}</span>
                      <span className={styles.ratingCount}>
                        ({store.reviewCount})
                      </span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        store.isVerified
                          ? styles.statusVerified
                          : styles.statusPending
                      }`}
                    >
                      {store.isVerified
                        ? t("stores.status.verified")
                        : t("stores.status.unverified")}
                    </span>
                  </td>
                  <td>
                    <span className={styles.productsValue}>
                      {store.productsCount.toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      {isAdmin && !store.isVerified && (
                        <button
                          onClick={() => handleVerifyStore(store.id)}
                          className="btn btn-success btn-sm"
                          title={t("stores.actions.verify")}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEditStore(store)}
                        className="btn btn-secondary btn-sm"
                        title={t("stores.actions.edit")}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStore(store.id)}
                        className="btn btn-danger btn-sm"
                        title={t("stores.actions.delete")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStores.length === 0 && (
          <div className={styles.emptyState}>{t("stores.empty")}</div>
        )}
      </div>

      {/* Store Modal - Rendered via Portal */}
      {isClient && showModal && (
        <StoreModal
          store={editingStore}
          onClose={() => {
            setShowModal(false);
            setEditingStore(null);
          }}
          onSave={() => {
            refetch();
            setShowModal(false);
            setEditingStore(null);
          }}
        />
      )}
    </div>
  );
};

export default StoresManagement;
