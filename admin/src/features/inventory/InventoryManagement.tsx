import React, { useEffect, useState } from "react";
import {
  Search,
  RefreshCw,
  Package,
  AlertTriangle,
  Edit,
  Save,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { productApi, storeApi } from "../../services/api";
import type { Product, Store } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useNotification } from "../../contexts/NotificationContext";
import { getImageUrl } from "../../shared/utils/imageUtils";
import { useAdminHeader } from "../../shared/hooks/useAdminHeader";
import Pagination from "../../shared/components/Pagination";
import styles from "./InventoryManagement.module.css";

const LOW_STOCK_THRESHOLD = 10;

const InventoryManagement: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [editingStock, setEditingStock] = useState<{ [key: string]: number }>({});
  const [savingStock, setSavingStock] = useState<string | null>(null);
  const { user } = useAuth();
  const { showError, showSuccess } = useNotification();
  const { setHeaderActions } = useAdminHeader();

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    if (selectedStoreId) {
      fetchProducts();
    } else {
      setProducts([]);
      setTotalItems(0);
    }
  }, [selectedStoreId, currentPage, itemsPerPage]);

  const fetchStores = async () => {
    try {
      const response = await storeApi.getAllStores();
      if (response.success) {
        setStores(response.data);
        if (response.data.length > 0 && !selectedStoreId) {
          setSelectedStoreId(response.data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
      showError(t("inventory.actions.loadStoresError"));
    }
  };

  const fetchProducts = async () => {
    if (!selectedStoreId) return;
    setLoading(true);
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const response = await productApi.getProductsByStore(
        selectedStoreId,
        undefined,
        itemsPerPage,
        offset
      );
      if (response.success) {
        setProducts(response.data);
        setTotalItems((response as any).total || response.data.length);
      } else {
        showError(t("inventory.actions.loadError"));
      }
    } catch (error: any) {
      console.error("Error fetching products:", error);
      showError(error.response?.data?.message || t("inventory.actions.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const handleEditStock = (productId: string, currentStock: number) => {
    setEditingStock({ ...editingStock, [productId]: currentStock });
  };

  const handleCancelEdit = (productId: string) => {
    const newEditingStock = { ...editingStock };
    delete newEditingStock[productId];
    setEditingStock(newEditingStock);
  };

  const handleSaveStock = async (productId: string) => {
    const newStock = editingStock[productId];
    if (newStock === undefined || newStock < 0) {
      showError(t("inventory.actions.invalidStock"));
      return;
    }

    setSavingStock(productId);
    try {
      const product = products.find((p) => p.id === productId);
      if (!product) {
        showError(t("inventory.actions.productNotFound"));
        return;
      }

      await productApi.updateProduct(productId, {
        stockQuantity: newStock,
      });

      // Update local state
      setProducts(
        products.map((p) =>
          p.id === productId ? { ...p, stockQuantity: newStock } : p
        )
      );

      // Clear editing state
      handleCancelEdit(productId);
      showSuccess(t("inventory.actions.updateSuccess"));
    } catch (error: any) {
      console.error("Error updating stock:", error);
      showError(
        error.response?.data?.message || t("inventory.actions.updateError")
      );
    } finally {
      setSavingStock(null);
    }
  };

  // Set header actions
  useEffect(() => {
    setHeaderActions(
      <>
        <button
          onClick={fetchProducts}
          className="btn btn-secondary"
          disabled={loading || !selectedStoreId}
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          {t("inventory.refresh")}
        </button>
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, selectedStoreId, setHeaderActions, t]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (itemsPerPage: number) => {
    setItemsPerPage(itemsPerPage);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const lowStockProducts = filteredProducts.filter(
    (p) => p.stockQuantity <= LOW_STOCK_THRESHOLD
  );

  const selectedStore = stores.find((s) => s.id === selectedStoreId);

  if (loading && products.length === 0) {
    return (
      <div className={styles.loading}>
        <div className="loading" />
        <span>{t("inventory.loading")}</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Store Selector and Filters */}
      <div className={`card ${styles.storeSelector}`}>
        <div className={styles.filters}>
          <div>
            <label className="form-label">{t("inventory.selectStore")}</label>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="form-input form-select"
            >
              <option value="">{t("inventory.selectStorePlaceholder")}</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
          {selectedStoreId && (
            <div className={styles.searchWrapper}>
              <Search className={styles.searchIcon} />
              <input
                type="text"
                placeholder={t("inventory.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`form-input ${styles.searchInput}`}
              />
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Alert */}
      {selectedStoreId && lowStockProducts.length > 0 && (
        <div className={`card ${styles.alertCard}`}>
          <div className={styles.alertContent}>
            <AlertTriangle className={styles.alertIcon} />
            <div>
              <strong>{t("inventory.lowStock.title")}</strong>
              <p>
                {t("inventory.lowStock.message", {
                  count: lowStockProducts.length,
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={styles.productsContainer}>
        {!selectedStoreId ? (
          <div className={`card ${styles.fullHeightCard}`}>
            <div className={styles.emptyState}>
              <Package className={styles.emptyIcon} />
              <p>{t("inventory.empty.noStore")}</p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className={`card ${styles.fullHeightCard}`}>
            <div className={styles.emptyState}>
              <Package className={styles.emptyIcon} />
              <p>{t("inventory.empty.noProducts")}</p>
            </div>
          </div>
        ) : (
          <div className={`card ${styles.fullHeightCard}`}>
            <div className="card-header">
              <h3 className="card-title">
                {t("inventory.table.title", { count: filteredProducts.length })}
              </h3>
            </div>

            <div className={`${styles.tableWrapper} ${styles.fullHeightTableWrapper}`}>
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("inventory.table.image")}</th>
                    <th>{t("inventory.table.name")}</th>
                    <th>{t("inventory.table.price")}</th>
                    <th>{t("inventory.table.stock")}</th>
                    <th>{t("inventory.table.category")}</th>
                    <th>{t("inventory.table.status")}</th>
                    <th>{t("inventory.table.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const isLowStock = product.stockQuantity <= LOW_STOCK_THRESHOLD;
                    const isEditing = editingStock[product.id] !== undefined;
                    const isSaving = savingStock === product.id;
                    const editValue = editingStock[product.id] ?? product.stockQuantity;

                    return (
                      <tr
                        key={product.id}
                        className={isLowStock ? styles.lowStockRow : ""}
                      >
                        <td>
                          <img
                            src={
                              getImageUrl(product.imageUrl) ||
                              "/images/default-product.png"
                            }
                            alt={product.name}
                            className={styles.productImage}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (
                                target.src !==
                                `${window.location.origin}/images/default-product.png`
                              ) {
                                target.src = "/images/default-product.png";
                              }
                            }}
                          />
                        </td>
                        <td>
                          <div className={styles.productCell}>
                            <div className={styles.productName}>{product.name}</div>
                            {product.description && (
                              <div className={styles.productDescription}>
                                {product.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          {t("inventory.table.currencyFormat", {
                            price: product.price.toFixed(2),
                          })}
                        </td>
                        <td>
                          {isEditing ? (
                            <div className={styles.stockEdit}>
                              <input
                                type="number"
                                min="0"
                                value={editValue}
                                onChange={(e) =>
                                  setEditingStock({
                                    ...editingStock,
                                    [product.id]: parseInt(e.target.value) || 0,
                                  })
                                }
                                className={`form-input ${styles.stockInput}`}
                                disabled={isSaving}
                                aria-label={t("inventory.actions.editStock")}
                              />
                              <div className={styles.stockActions}>
                                <button
                                  onClick={() => handleSaveStock(product.id)}
                                  className="btn btn-sm btn-primary"
                                  disabled={isSaving}
                                  title={t("inventory.actions.save")}
                                  aria-label={t("inventory.actions.save")}
                                >
                                  {isSaving ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Save className="w-3 h-3" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleCancelEdit(product.id)}
                                  className="btn btn-sm btn-secondary"
                                  disabled={isSaving}
                                  title={t("inventory.actions.cancel")}
                                  aria-label={t("inventory.actions.cancel")}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className={styles.stockDisplay}>
                              <span
                                className={
                                  isLowStock
                                    ? styles.lowStockBadge
                                    : styles.stockBadge
                                }
                                title={
                                  isLowStock
                                    ? t("inventory.lowStock.title")
                                    : undefined
                                }
                              >
                                {product.stockQuantity}
                                {isLowStock && (
                                  <AlertTriangle
                                    className={styles.alertIconSmall}
                                    aria-label={t("inventory.lowStock.title")}
                                  />
                                )}
                              </span>
                            </div>
                          )}
                        </td>
                        <td>{product.category || t("inventory.table.noCategory")}</td>
                        <td>
                          <span
                            className={`badge ${
                              product.isActive
                                ? "badge-success"
                                : "badge-secondary"
                            }`}
                          >
                            {product.isActive
                              ? t("inventory.status.active")
                              : t("inventory.status.inactive")}
                          </span>
                        </td>
                        <td>
                          {!isEditing && (
                            <button
                              onClick={() =>
                                handleEditStock(product.id, product.stockQuantity)
                              }
                              className="btn btn-sm btn-icon"
                              title={t("inventory.actions.editStock")}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryManagement;

