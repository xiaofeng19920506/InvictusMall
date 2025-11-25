import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, AlertCircle, Package, Truck } from "lucide-react";
import { returnApi, type OrderItem } from "../../services/api";
import { getImageUrl } from "../../shared/utils/imageUtils";
import { useNotification } from "../../contexts/NotificationContext";
import styles from "./ReturnModal.module.css";

export interface ReturnModalProps {
  orderId: string;
  orderItem: OrderItem;
  onClose: () => void;
  onReturnSuccess: () => void;
}

const ReturnModal: React.FC<ReturnModalProps> = ({
  orderId,
  orderItem,
  onClose,
  onReturnSuccess,
}) => {
  const { t } = useTranslation();
  const { showSuccess, showError } = useNotification();

  const [reason, setReason] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      setError(t("orders.return.errors.reasonRequired") || "Please provide a reason for the return");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await returnApi.createReturn({
        orderId,
        orderItemId: orderItem.id,
        reason: reason.trim(),
      });

      if (response.success) {
        showSuccess(t("orders.return.createSuccess") || "Return request created successfully");
        onReturnSuccess();
        onClose();
      } else {
        setError(response.message || t("orders.return.createError") || "Failed to create return request");
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || t("orders.return.createError") || "Failed to create return request";
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.backdropContainer}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div className={styles.dialog} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h3 className={styles.title}>
            {t("orders.return.title") || "Request Return"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("orders.return.close") || "Close"}
            className={styles.closeButton}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={styles.content}>
          {/* Item Information */}
          <div className={styles.itemSection}>
            <h4 className={styles.sectionTitle}>
              {t("orders.return.itemInfo") || "Item Information"}
            </h4>
            <div className={styles.itemCard}>
              {orderItem.productImage ? (
                <img
                  src={getImageUrl(orderItem.productImage)}
                  alt={orderItem.productName}
                  className={styles.itemImage}
                />
              ) : (
                <div className={styles.itemImagePlaceholder}>
                  <Package className={styles.itemImageIcon} />
                </div>
              )}
              <div className={styles.itemDetails}>
                <h5 className={styles.itemName}>{orderItem.productName}</h5>
                <div className={styles.itemInfo}>
                  <span className={styles.itemQuantity}>
                    {t("orders.quantity") || "Qty"}: {orderItem.quantity}
                  </span>
                  <span className={styles.itemPrice}>
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(orderItem.subtotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Return Form */}
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                {t("orders.return.reason") || "Reason for Return"} <span className={styles.required}>*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={styles.textarea}
                rows={4}
                placeholder={t("orders.return.reasonPlaceholder") || "Please provide a detailed reason for the return..."}
                required
              />
            </div>

            {error && (
              <div className={styles.error}>
                <AlertCircle className={styles.errorIcon} />
                <span>{error}</span>
              </div>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={isProcessing}
              >
                {t("orders.return.cancel") || "Cancel"}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isProcessing || !reason.trim()}
              >
                {isProcessing
                  ? t("orders.return.processing") || "Processing..."
                  : t("orders.return.submit") || "Submit Return Request"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReturnModal;

