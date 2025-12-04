import React, { useEffect, useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  RefreshCw,
  Package,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { productApi, storeApi } from "../../services/api";
import type { Product, Store } from "../../services/api";
// import { useAuth } from "../../contexts/AuthContext"; // Unused for now
import { useNotification } from "../../contexts/NotificationContext";
import { getImageUrl } from "../../shared/utils/imageUtils";
import { useAdminHeader } from "../../shared/hooks/useAdminHeader";
import Pagination from "../../shared/components/Pagination";
import ProductModal from "./ProductModal";
import ConfirmModal from "../../shared/components/ConfirmModal";
import styles from "./ProductsManagement.module.css";

const ProductsManagement: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  // const { user } = useAuth(); // Unused for now
  const { showError, showSuccess } = useNotification();
  const { setHeaderActions } = useAdminHeader();
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning',
  });

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
      showError(t("products.actions.loadStoresError"));
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
        showError(t("products.actions.loadError"));
      }
    } catch (error: any) {
      console.error("Error fetching products:", error);
      showError(error.response?.data?.message || t("products.actions.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: t("products.actions.confirmDeleteTitle"),
      message: t("products.actions.confirmDeleteMessage"),
      type: 'danger',
      onConfirm: async () => {
        try {
          await productApi.deleteProduct(id);
          await fetchProducts();
          showSuccess(t("products.actions.deleteSuccess"));
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (error: any) {
          console.error("Error deleting product:", error);
          showError(error.response?.data?.message || t("products.actions.deleteError"));
          setConfirmModal({ ...confirmModal, isOpen: false });
        }
      },
    });
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowModal(true);
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowModal(true);
  };

  // Set header actions (after handleAddProduct is defined)
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
          {t("products.refresh")}
        </button>
        <button 
          onClick={handleAddProduct} 
          className="btn btn-primary"
          disabled={!selectedStoreId}
        >
          <Plus className="w-4 h-4 mr-2" />
          {t("products.addProduct")}
        </button>
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, selectedStoreId, setHeaderActions, t]);

  const handleModalClose = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleModalSave = async () => {
    await fetchProducts();
    handleModalClose();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (itemsPerPage: number) => {
    setItemsPerPage(itemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // const selectedStore = stores.find(s => s.id === selectedStoreId); // Unused for now

  if (loading && products.length === 0) {
    return (
      <div className={styles.loading}>
        <div className="loading" />
        <span>{t("products.loading")}</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Store Selector */}
      <div className={`card ${styles.storeSelector}`}>
        <div className={styles.filters}>
          <div>
            <label className="form-label">{t("products.selectStore")}</label>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="form-input form-select"
            >
              <option value="">{t("products.selectStorePlaceholder")}</option>
              {stores.map(store => (
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
                placeholder={t("products.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`form-input ${styles.searchInput}`}
              />
            </div>
          )}
        </div>
      </div>

      <div className={styles.productsContainer}>
        {!selectedStoreId ? (
          <div className={`card ${styles.fullHeightCard}`}>
            <div className={styles.emptyState}>
              <Package className={styles.emptyIcon} />
              <p>{t("products.empty.noStore")}</p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className={`card ${styles.fullHeightCard}`}>
            <div className={styles.emptyState}>
              <Package className={styles.emptyIcon} />
              <p>{t("products.empty.noProducts")}</p>
              <button onClick={handleAddProduct} className="btn btn-primary mt-4">
                <Plus className="w-4 h-4 mr-2" />
                {t("products.empty.addFirst")}
              </button>
            </div>
          </div>
        ) : (
          <div className={`card ${styles.fullHeightCard}`}>
            <div className="card-header">
              <h3 className="card-title">
                {t("products.table.title", { count: filteredProducts.length })}
              </h3>
            </div>

            <div className={`${styles.tableWrapper} ${styles.fullHeightTableWrapper}`}>
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("products.table.image")}</th>
                    <th>{t("products.table.name")}</th>
                    <th>{t("products.table.price")}</th>
                    <th>{t("products.table.stock")}</th>
                    <th>{t("products.table.category")}</th>
                    <th>{t("products.table.status")}</th>
                    <th>{t("products.table.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <img
                          src={getImageUrl(
                            product.imageUrls && product.imageUrls.length > 0
                              ? product.imageUrls[0]
                              : product.imageUrl
                          ) || '/images/default-product.png'}
                          alt={product.name}
                          className={styles.productImage}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src !== `${window.location.origin}/images/default-product.png`) {
                              target.src = '/images/default-product.png';
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
                      <td>${product.price.toFixed(2)}</td>
                      <td>{product.stockQuantity}</td>
                      <td>{product.category || '-'}</td>
                      <td>
                        <span
                          className={`badge ${
                            product.isActive ? "badge-success" : "badge-secondary"
                          }`}
                        >
                          {product.isActive ? t("products.status.active") : t("products.status.inactive")}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="btn btn-sm btn-icon"
                            title={t("products.actions.edit")}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="btn btn-sm btn-icon btn-danger"
                            title={t("products.actions.delete")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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

      {/* Product Modal */}
      {showModal && (
        <ProductModal
          product={editingProduct}
          storeId={selectedStoreId}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        type={confirmModal.type}
      />
    </div>
  );
};

export default ProductsManagement;

