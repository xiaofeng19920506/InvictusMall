import React, { useEffect, useMemo } from "react";
import { RefreshCw, Package } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import { useAdminHeader } from "../../shared/hooks/useAdminHeader";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import {
  setSelectedStoreId,
  setSearchTerm,
  setProductsPage,
  setProductsItemsPerPage,
  removeEditingStock,
  setSavingStock,
  setActiveTab,
} from "../../store/slices/inventorySlice";
import {
  useGetAllStoresQuery,
  useGetProductsByStoreQuery,
  useUpdateProductStockMutation,
  useGetStockOperationsQuery,
} from "../../store/api/inventoryApi";
import { useNotification } from "../../contexts/NotificationContext";
import InventoryTabs from "./components/InventoryTabs";
import StoreSelector from "./components/StoreSelector";
import LowStockAlert from "./components/LowStockAlert";
import ProductsTable from "./components/ProductsTable";
import StockOperationsHistory from "./components/StockOperationsHistory";
import styles from "./InventoryManagement.module.css";

const LOW_STOCK_THRESHOLD = 10;

const InventoryManagement: React.FC = () => {
  const { t } = useTranslation();
  const { effectiveTheme } = useTheme();
  const dispatch = useAppDispatch();
  const { showError, showSuccess } = useNotification();
  const { setHeaderActions } = useAdminHeader();

  // Redux state
  const {
    selectedStoreId,
    searchTerm,
    productsPage,
    productsItemsPerPage,
    editingStock,
    activeTab,
    operationsPage,
    operationsItemsPerPage,
    operationsTypeFilter,
    selectedProductForHistory,
  } = useAppSelector((state) => state.inventory);

  // RTK Query hooks
  const { data: stores = [], isLoading: storesLoading } =
    useGetAllStoresQuery();

  const {
    data: productsData,
    isLoading: productsLoading,
    isFetching: productsFetching,
    refetch: refetchProducts,
  } = useGetProductsByStoreQuery(
    {
      storeId: selectedStoreId,
      limit: productsItemsPerPage,
      offset: (productsPage - 1) * productsItemsPerPage,
    },
    { skip: !selectedStoreId }
  );

  const {
    data: stockOperationsData,
    isLoading: operationsLoading,
    isFetching: operationsFetching,
    refetch: refetchOperations,
  } = useGetStockOperationsQuery(
    {
      productId: selectedProductForHistory || undefined,
      type: operationsTypeFilter
        ? (operationsTypeFilter as "in" | "out")
        : undefined,
      limit: operationsItemsPerPage,
      offset: (operationsPage - 1) * operationsItemsPerPage,
    },
    { skip: activeTab !== "history" }
  );

  const [updateProductStock, { isLoading: isUpdatingStock }] =
    useUpdateProductStockMutation();

  // Initialize selected store when stores load
  useEffect(() => {
    if (stores.length > 0 && !selectedStoreId) {
      dispatch(setSelectedStoreId(stores[0].id));
    }
  }, [stores, selectedStoreId, dispatch]);

  // Get products list from RTK Query data
  const products = useMemo(() => productsData?.products || [], [productsData?.products]);
  const totalItems = productsData?.total || 0;

  // Get stock operations from RTK Query data
  const stockOperations = useMemo(
    () => stockOperationsData?.operations || [],
    [stockOperationsData?.operations]
  );
  const totalOperations = stockOperationsData?.total || 0;

  // Filtered products based on search
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [products, searchTerm]);

  const lowStockProducts = useMemo(() => {
    return filteredProducts.filter(
      (p) => p.stockQuantity <= LOW_STOCK_THRESHOLD
    );
  }, [filteredProducts]);

  // Set header actions
  useEffect(() => {
    setHeaderActions(
      <>
        <button
          onClick={() => refetchProducts()}
          className="btn btn-secondary"
          disabled={productsLoading || productsFetching || !selectedStoreId}
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${
              productsLoading || productsFetching ? "animate-spin" : ""
            }`}
          />
          {t("inventory.refresh")}
        </button>
      </>
    );
  }, [
    productsLoading,
    productsFetching,
    selectedStoreId,
    setHeaderActions,
    t,
    refetchProducts,
  ]);

  const handleSaveStock = async (productId: string) => {
    const newStock = editingStock[productId];
    if (newStock === undefined || newStock < 0) {
      showError(t("inventory.actions.invalidStock"));
      return;
    }

    dispatch(setSavingStock(productId));
    try {
      await updateProductStock({
        productId,
        stockQuantity: newStock,
      }).unwrap();

      dispatch(removeEditingStock(productId));
      showSuccess(t("inventory.actions.updateSuccess"));

      // Refetch operations if on history tab
      if (activeTab === "history") {
        refetchOperations();
      }
    } catch (error: unknown) {
      console.error("Error updating stock:", error);
      const errorMessage =
        (error && typeof error === "object" && "data" in error
          ? (error as { data?: { message?: string } }).data?.message
          : null) ||
        (error instanceof Error ? error.message : null) ||
        t("inventory.actions.updateError");
      showError(errorMessage);
    } finally {
      dispatch(setSavingStock(null));
    }
  };

  const handleCancelEdit = (productId: string) => {
    dispatch(removeEditingStock(productId));
  };

  const handlePageChange = (page: number) => {
    dispatch(setProductsPage(page));
  };

  const handleItemsPerPageChange = (itemsPerPage: number) => {
    dispatch(setProductsItemsPerPage(itemsPerPage));
  };

  if (productsLoading && products.length === 0 && selectedStoreId) {
    return (
      <div className={styles.loading}>
        <div className="loading" />
        <span>{t("inventory.loading")}</span>
      </div>
    );
  }

  const isLoading = productsLoading || productsFetching;
  const isLoadingOperations = operationsLoading || operationsFetching;

  return (
    <div
      className={`${styles.container} ${
        effectiveTheme === "dark" ? styles.dark : ""
      }`}
    >
      <InventoryTabs
        activeTab={activeTab}
        onTabChange={(tab) => dispatch(setActiveTab(tab))}
      />

      <StoreSelector
        stores={stores}
        selectedStoreId={selectedStoreId}
        searchTerm={searchTerm}
        isLoading={storesLoading}
        onStoreChange={(storeId) => dispatch(setSelectedStoreId(storeId))}
        onSearchChange={(term) => dispatch(setSearchTerm(term))}
      />

      {activeTab === "history" && (
        <StockOperationsHistory
          stockOperations={stockOperations}
          totalOperations={totalOperations}
          products={products}
          isLoading={isLoadingOperations}
          onRefetch={() => refetchOperations()}
        />
      )}

      {activeTab === "products" && (
        <>
          {selectedStoreId && lowStockProducts.length > 0 && (
            <LowStockAlert count={lowStockProducts.length} />
          )}

          <div className={styles.productsContainer}>
            {!selectedStoreId ? (
              <div className={`card ${styles.fullHeightCard}`}>
                <div className={styles.emptyState}>
                  <Package className={styles.emptyIcon} />
                  <p>{t("inventory.empty.noStore")}</p>
                </div>
              </div>
            ) : (
              <ProductsTable
                products={filteredProducts}
                totalItems={totalItems}
                currentPage={productsPage}
                itemsPerPage={productsItemsPerPage}
                isLoading={isLoading}
                isUpdatingStock={isUpdatingStock}
                onSaveStock={handleSaveStock}
                onCancelEdit={handleCancelEdit}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default InventoryManagement;
