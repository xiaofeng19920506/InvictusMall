import React, { useEffect, useState } from "react";
import {
  Search,
  RefreshCw,
  Package,
  AlertTriangle,
  Edit,
  Save,
  X,
  History,
  Eye,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { productApi, storeApi, stockOperationApi, type StockOperation } from "../../services/api";
import type { Product, Store } from "../../services/api";
// import { useAuth } from "../../contexts/AuthContext"; // Unused for now
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
  const { showError, showSuccess } = useNotification();
  const { setHeaderActions } = useAdminHeader();
  
  // Stock operations history
  const [activeTab, setActiveTab] = useState<'products' | 'history'>('products');
  const [stockOperations, setStockOperations] = useState<StockOperation[]>([]);
  const [loadingOperations, setLoadingOperations] = useState(false);
  const [operationsPage, setOperationsPage] = useState(1);
  const [operationsItemsPerPage, setOperationsItemsPerPage] = useState(20);
  const [totalOperations, setTotalOperations] = useState(0);
  const [operationsTypeFilter, setOperationsTypeFilter] = useState<string>('');
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<string | null>(null);

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

  useEffect(() => {
    if (activeTab === 'history') {
      fetchStockOperations();
    }
  }, [activeTab, operationsPage, operationsItemsPerPage, operationsTypeFilter, selectedProductForHistory]);

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
      
      // Refresh operations history if on that tab
      if (activeTab === 'history') {
        fetchStockOperations();
      }
    } catch (error: any) {
      console.error("Error updating stock:", error);
      showError(
        error.response?.data?.message || t("inventory.actions.updateError")
      );
    } finally {
      setSavingStock(null);
    }
  };

  const fetchStockOperations = async () => {
    setLoadingOperations(true);
    try {
      const offset = (operationsPage - 1) * operationsItemsPerPage;
      const params: any = {
        limit: operationsItemsPerPage,
        offset,
      };
      
      if (operationsTypeFilter) {
        params.type = operationsTypeFilter as 'in' | 'out';
      }
      
      if (selectedProductForHistory) {
        params.productId = selectedProductForHistory;
      }

      const response = await stockOperationApi.getStockOperations(params);
      if (response.success && response.data) {
        setStockOperations(response.data.operations);
        setTotalOperations(response.data.total);
      }
    } catch (error: any) {
      console.error("Error loading stock operations:", error);
      showError(error.response?.data?.message || "Failed to load stock operations");
    } finally {
      setLoadingOperations(false);
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

  // const selectedStore = stores.find((s) => s.id === selectedStoreId); // Unused for now

  if (loading && products.length === 0) {
    return (
      <div className={styles.loading}>
        <div className="loading" />
        <span>{t("inventory.loading")}</span>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className={styles.container}>
      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'products' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <Package className="w-4 h-4 mr-2" />
          {t("inventory.tabs.products") || "Products"}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'history' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History className="w-4 h-4 mr-2" />
          {t("inventory.tabs.history") || "Stock Operations History"}
        </button>
      </div>

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

      {/* Stock Operations History Tab */}
      {activeTab === 'history' && (
        <div className={`card ${styles.fullHeightCard}`}>
          <div className="card-header">
            <div className={styles.historyHeader}>
              <h3 className="card-title">
                {t("inventory.history.title") || "Stock Operations History"}
              </h3>
              <div className={styles.historyFilters}>
                {selectedStoreId && (
                  <select
                    value={selectedProductForHistory || ''}
                    onChange={(e) => {
                      setSelectedProductForHistory(e.target.value || null);
                      setOperationsPage(1);
                    }}
                    className="form-input form-select"
                    style={{ minWidth: '200px' }}
                  >
                    <option value="">{t("inventory.history.allProducts") || "All Products"}</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                )}
                <select
                  value={operationsTypeFilter}
                  onChange={(e) => {
                    setOperationsTypeFilter(e.target.value);
                    setOperationsPage(1);
                  }}
                  className="form-input form-select"
                >
                  <option value="">{t("inventory.history.allTypes") || "All Types"}</option>
                  <option value="in">{t("inventory.history.typeIn") || "Stock In"}</option>
                  <option value="out">{t("inventory.history.typeOut") || "Stock Out"}</option>
                </select>
                <button
                  onClick={fetchStockOperations}
                  className="btn btn-secondary btn-sm"
                  disabled={loadingOperations}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingOperations ? "animate-spin" : ""}`} />
                  {t("inventory.refresh")}
                </button>
              </div>
            </div>
          </div>

          {loadingOperations && stockOperations.length === 0 ? (
            <div className={styles.loading}>
              <div className="loading" />
              <span>{t("inventory.loading")}</span>
            </div>
          ) : stockOperations.length === 0 ? (
            <div className={styles.emptyState}>
              <History className={styles.emptyIcon} />
              <p>{t("inventory.history.empty") || "No stock operations found"}</p>
            </div>
          ) : (
            <>
              <div className={styles.tableWrapper}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("inventory.history.table.date") || "Date"}</th>
                      <th>{t("inventory.history.table.product") || "Product"}</th>
                      <th>{t("inventory.history.table.type") || "Type"}</th>
                      <th>{t("inventory.history.table.quantity") || "Quantity"}</th>
                      <th>{t("inventory.history.table.before") || "Before"}</th>
                      <th>{t("inventory.history.table.after") || "After"}</th>
                      <th>{t("inventory.history.table.reason") || "Reason"}</th>
                      <th>{t("inventory.history.table.order") || "Order"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockOperations.map((operation) => (
                      <tr key={operation.id}>
                        <td>{formatDate(operation.performedAt)}</td>
                        <td>
                          <div className={styles.productCell}>
                            {operation.product?.imageUrl && (
                              <img
                                src={getImageUrl(operation.product.imageUrl)}
                                alt={operation.product.name}
                                className={styles.productImageSmall}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "/images/default-product.png";
                                }}
                              />
                            )}
                            <span>{operation.product?.name || operation.productId}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${operation.type === 'in' ? 'badge-success' : 'badge-danger'}`}>
                            {operation.type === 'in' ? (
                              <>
                                <ArrowUp className="w-3 h-3 mr-1" />
                                {t("inventory.history.typeIn") || "In"}
                              </>
                            ) : (
                              <>
                                <ArrowDown className="w-3 h-3 mr-1" />
                                {t("inventory.history.typeOut") || "Out"}
                              </>
                            )}
                          </span>
                        </td>
                        <td>{operation.quantity}</td>
                        <td>{operation.previousQuantity}</td>
                        <td>
                          <strong>{operation.newQuantity}</strong>
                        </td>
                        <td>{operation.reason || '-'}</td>
                        <td>
                          {operation.orderId ? (
                            <button
                              onClick={() => {
                                window.open(`/admin/orders/${operation.orderId}`, '_blank');
                              }}
                              className="btn btn-sm btn-link"
                            >
                              {operation.orderId.substring(0, 8)}...
                            </button>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={operationsPage}
                totalPages={Math.ceil(totalOperations / operationsItemsPerPage)}
                totalItems={totalOperations}
                itemsPerPage={operationsItemsPerPage}
                onPageChange={setOperationsPage}
                onItemsPerPageChange={(items) => {
                  setOperationsItemsPerPage(items);
                  setOperationsPage(1);
                }}
              />
            </>
          )}
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <>
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
        </>
      )}
    </div>
  );
};

export default InventoryManagement;

