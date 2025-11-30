import React from "react";
import { Edit, Save, X, RefreshCw, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppDispatch } from "../../../store/hooks";
import { setEditingStock } from "../../../store/slices/inventorySlice";
import type { Product } from "../../../services/api/productApi";
import { getImageUrl } from "../../../shared/utils/imageUtils";
import styles from "../InventoryManagement.module.css";

const LOW_STOCK_THRESHOLD = 10;

interface ProductRowProps {
  product: Product;
  isEditing: boolean;
  isSaving: boolean;
  editValue: number;
  onSave: (productId: string) => Promise<void>;
  onCancel: (productId: string) => void;
}

const ProductRow: React.FC<ProductRowProps> = ({
  product,
  isEditing,
  isSaving,
  editValue,
  onSave,
  onCancel,
}) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const isLowStock = product.stockQuantity <= LOW_STOCK_THRESHOLD;

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
          <div className={styles.productName}>
            {product.name}
          </div>
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
                dispatch(
                  setEditingStock({
                    productId: product.id,
                    stock: parseInt(e.target.value) || 0,
                  })
                )
              }
              className={`form-input ${styles.stockInput}`}
              disabled={isSaving}
              aria-label={t("inventory.actions.editStock")}
            />
            <div className={styles.stockActions}>
              <button
                onClick={() => onSave(product.id)}
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
                onClick={() => onCancel(product.id)}
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
      <td>
        {product.category ||
          t("inventory.table.noCategory")}
      </td>
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
            onClick={() => {
              dispatch(setEditingStock({ productId: product.id, stock: product.stockQuantity }));
            }}
            className="btn btn-sm btn-icon"
            title={t("inventory.actions.editStock")}
          >
            <Edit className="w-4 h-4" />
          </button>
        )}
      </td>
    </tr>
  );
};

export default ProductRow;


