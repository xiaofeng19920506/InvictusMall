import React from "react";
import { Package } from "lucide-react";
import { useTranslation } from "react-i18next";
import Pagination from "../../../shared/components/Pagination";
import ProductRow from "./ProductRow";
import type { Product } from "../../../services/api/productApi";
import { useAppSelector } from "../../../store/hooks";
import styles from "../InventoryManagement.module.css";

interface ProductsTableProps {
  products: Product[];
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  isLoading: boolean;
  isUpdatingStock: boolean;
  onSaveStock: (productId: string) => Promise<void>;
  onCancelEdit: (productId: string) => void;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}

const ProductsTable: React.FC<ProductsTableProps> = ({
  products,
  totalItems,
  currentPage,
  itemsPerPage,
  isLoading,
  isUpdatingStock,
  onSaveStock,
  onCancelEdit,
  onPageChange,
  onItemsPerPageChange,
}) => {
  const { t } = useTranslation();
  const { editingStock, savingStock } = useAppSelector((state) => state.inventory);

  if (!products.length && !isLoading) {
    return (
      <div className={`card ${styles.fullHeightCard}`}>
        <div className={styles.emptyState}>
          <Package className={styles.emptyIcon} />
          <p>{t("inventory.empty.noProducts")}</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className={`card ${styles.fullHeightCard}`}>
      <div className="card-header">
        <h3 className="card-title">
          {t("inventory.table.title", {
            count: products.length,
          })}
        </h3>
      </div>

      <div
        className={`${styles.tableWrapper} ${styles.fullHeightTableWrapper}`}
      >
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
            {products.map((product) => {
              const isEditing = editingStock[product.id] !== undefined;
              const isSaving =
                savingStock === product.id ||
                (isUpdatingStock && savingStock === product.id);
              const editValue = editingStock[product.id] ?? product.stockQuantity;

              return (
                <ProductRow
                  key={product.id}
                  product={product}
                  isEditing={isEditing}
                  isSaving={isSaving}
                  editValue={editValue}
                  onSave={onSaveStock}
                  onCancel={onCancelEdit}
                />
              );
            })}
          </tbody>
        </table>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
        />
      </div>
    </div>
  );
};

export default ProductsTable;

