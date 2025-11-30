import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { orderApi, type Order, type OrderStatus } from "../../services/api";
import { useNotification } from "../../contexts/NotificationContext";
import styles from "./OrderStatusModal.module.css";

export interface OrderStatusModalProps {
  order: Order;
  onClose: () => void;
  onUpdate: () => void;
}

const OrderStatusModal: React.FC<OrderStatusModalProps> = ({
  order,
  onClose,
  onUpdate,
}) => {
  const { t } = useTranslation();
  const { showError, showSuccess } = useNotification();
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [trackingNumber, setTrackingNumber] = useState(
    order.trackingNumber || ""
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (status === order.status && trackingNumber === (order.trackingNumber || "")) {
      showError(t("orders.error.noChanges") || "No changes to save");
      return;
    }

    setSaving(true);
    try {
      const response = await orderApi.updateOrderStatus(order.id, {
        status,
        trackingNumber: trackingNumber.trim() || undefined,
      });

      if (response.success) {
        showSuccess(t("orders.success.statusUpdated") || "Order status updated successfully");
        onUpdate();
      } else {
        showError(response.message || t("orders.error.updateFailed") || "Failed to update order status");
      }
    } catch (error: any) {
      console.error("Error updating order status:", error);
      const errorMessage =
        error.response?.data?.message || error.message || t("orders.error.updateFailed") || "Failed to update order status";
      showError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <div className={styles.backdropContainer}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div className={styles.dialog} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h3 className={styles.title}>
            {t("orders.modal.updateStatusTitle") || "Update Order Status"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("orders.modal.close") || "Close"}
            className={styles.closeButton}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.orderInfo}>
            <p className={styles.orderId}>
              <strong>{t("orders.modal.orderId") || "Order ID"}:</strong> {order.id}
            </p>
            <p className={styles.orderTotal}>
              <strong>{t("orders.modal.total") || "Total"}:</strong> ${order.totalAmount.toFixed(2)}
            </p>
            <p className={styles.currentStatus}>
              <strong>{t("orders.modal.currentStatus") || "Current Status"}:</strong>{" "}
              <span className={styles.statusValue}>{order.status}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="status">
                {t("orders.modal.newStatus") || "New Status"} <span className={styles.required}>*</span>
              </label>
              <select
                id="status"
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                className={styles.input}
                required
              >
                <option value="pending_payment">
                  {t("orders.status.pending_payment") || "Pending Payment"}
                </option>
                <option value="pending">{t("orders.status.pending") || "Pending"}</option>
                <option value="processing">
                  {t("orders.status.processing") || "Processing"}
                </option>
                <option value="shipped">{t("orders.status.shipped") || "Shipped"}</option>
                <option value="delivered">
                  {t("orders.status.delivered") || "Delivered"}
                </option>
                <option value="cancelled">
                  {t("orders.status.cancelled") || "Cancelled"}
                </option>
                <option value="return_processing">
                  {t("orders.status.return_processing") || "Return Processing"}
                </option>
                <option value="returned">
                  {t("orders.status.returned") || "Returned"}
                </option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="trackingNumber">
                {t("orders.modal.trackingNumber") || "Tracking Number"}
              </label>
              <input
                type="text"
                id="trackingNumber"
                name="trackingNumber"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className={styles.input}
                placeholder={t("orders.modal.trackingNumberPlaceholder") || "Enter tracking number (optional)"}
              />
              <small className={styles.helpText}>
                {t("orders.modal.trackingNumberHelp") || "Optional tracking number for shipped orders"}
              </small>
            </div>

            <div className={styles.actions}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving
                  ? t("orders.modal.saving") || "Saving..."
                  : t("orders.modal.update") || "Update Status"}
              </button>
              <button type="button" onClick={onClose} className="btn btn-secondary" disabled={saving}>
                {t("orders.modal.cancel") || "Cancel"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OrderStatusModal;

