import React from "react";
import { RefreshCw, History, ArrowUp, ArrowDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppSelector, useAppDispatch } from "../../../store/hooks";
import {
  setOperationsPage,
  setOperationsItemsPerPage,
  setOperationsTypeFilter,
  setSelectedProductForHistory,
} from "../../../store/slices/inventorySlice";
import Pagination from "../../../shared/components/Pagination";
import { getImageUrl } from "../../../shared/utils/imageUtils";
import type { StockOperation } from "../../../services/api/stockOperationApi";
import type { Product } from "../../../services/api/productApi";
import styles from "../InventoryManagement.module.css";

interface StockOperationsHistoryProps {
  stockOperations: StockOperation[];
  totalOperations: number;
  products: Product[];
  isLoading: boolean;
  onRefetch: () => void;
}

const StockOperationsHistory: React.FC<StockOperationsHistoryProps> = ({
  stockOperations,
  totalOperations,
  products,
  isLoading,
  onRefetch,
}) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const {
    operationsPage,
    operationsItemsPerPage,
    operationsTypeFilter,
    selectedProductForHistory,
    selectedStoreId,
  } = useAppSelector((state) => state.inventory);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (isLoading && stockOperations.length === 0) {
    return (
      <div className={`card ${styles.fullHeightCard}`}>
        <div className={styles.loading}>
          <div className="loading" />
          <span>{t("inventory.loading")}</span>
        </div>
      </div>
    );
  }

  if (stockOperations.length === 0) {
    return (
      <div className={`card ${styles.fullHeightCard}`}>
        <div className={styles.emptyState}>
          <History className={styles.emptyIcon} />
          <p>
            {t("inventory.history.empty") || "No stock operations found"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${styles.fullHeightCard}`}>
      <div className="card-header">
        <div className={styles.historyHeader}>
          <h3 className="card-title">
            {t("inventory.history.title") || "Stock Operations History"}
          </h3>
          <div className={styles.historyFilters}>
            {selectedStoreId && products.length > 0 && (
              <select
                value={selectedProductForHistory || ""}
                onChange={(e) => {
                  dispatch(
                    setSelectedProductForHistory(e.target.value || null)
                  );
                }}
                className="form-input form-select"
                style={{ minWidth: "200px" }}
              >
                <option value="">
                  {t("inventory.history.allProducts") || "All Products"}
                </option>
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
                dispatch(setOperationsTypeFilter(e.target.value));
              }}
              className="form-input form-select"
            >
              <option value="">
                {t("inventory.history.allTypes") || "All Types"}
              </option>
              <option value="in">
                {t("inventory.history.typeIn") || "Stock In"}
              </option>
              <option value="out">
                {t("inventory.history.typeOut") || "Stock Out"}
              </option>
            </select>
            <button
              onClick={onRefetch}
              className="btn btn-secondary btn-sm"
              disabled={isLoading}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              {t("inventory.refresh")}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className="table">
          <thead>
            <tr>
              <th>{t("inventory.history.table.date") || "Date"}</th>
              <th>
                {t("inventory.history.table.product") || "Product"}
              </th>
              <th>{t("inventory.history.table.type") || "Type"}</th>
              <th>
                {t("inventory.history.table.quantity") || "Quantity"}
              </th>
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
                    <span>
                      {operation.product?.name || operation.productId}
                    </span>
                  </div>
                </td>
                <td>
                  <span
                    className={`badge ${
                      operation.type === "in"
                        ? "badge-success"
                        : "badge-danger"
                    }`}
                  >
                    {operation.type === "in" ? (
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
                <td>{operation.reason || "-"}</td>
                <td>
                  {operation.orderId ? (
                    <button
                      onClick={() => {
                        window.open(
                          `/admin/orders/${operation.orderId}`,
                          "_blank"
                        );
                      }}
                      className="btn btn-sm btn-link"
                    >
                      {operation.orderId.substring(0, 8)}...
                    </button>
                  ) : (
                    "-"
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
        onPageChange={(page) => dispatch(setOperationsPage(page))}
        onItemsPerPageChange={(items) => {
          dispatch(setOperationsItemsPerPage(items));
        }}
      />
    </div>
  );
};

export default StockOperationsHistory;


