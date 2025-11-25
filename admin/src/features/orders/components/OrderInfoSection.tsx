import React from "react";
import { useTranslation } from "react-i18next";
import { Package, Calendar, Truck } from "lucide-react";
import { type Order } from "../../../services/api";
import styles from "../OrderDetailModal.module.css";

interface OrderInfoSectionProps {
  order: Order;
  totalRefunded: number;
  formatDate: (dateString: string) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  getStatusBadgeClass: (status: string) => string;
  formatStatus: (status: string) => string;
}

const OrderInfoSection: React.FC<OrderInfoSectionProps> = ({
  order,
  totalRefunded,
  formatDate,
  formatCurrency,
  getStatusBadgeClass,
  formatStatus,
}) => {
  const { t } = useTranslation();

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <Package className={styles.sectionIcon} />
        <h4 className={styles.sectionTitle}>
          {t("orders.modal.orderInfo") || "Order Information"}
        </h4>
      </div>
      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>
            {t("orders.modal.orderId") || "Order ID"}:
          </span>
          <code className={styles.infoValue}>{order.id}</code>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>
            {t("orders.modal.store") || "Store"}:
          </span>
          <span className={styles.infoValue}>{order.storeName}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>
            {t("orders.modal.status") || "Status"}:
          </span>
          <span
            className={`${styles.statusBadge} ${getStatusBadgeClass(order.status)}`}
          >
            {formatStatus(order.status)}
          </span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>
            {t("orders.modal.total") || "Total"}:
          </span>
          <div className={styles.totalAmountContainer}>
            <span className={`${styles.infoValue} ${styles.totalAmount}`}>
              {formatCurrency(order.totalAmount - totalRefunded)}
            </span>
            {totalRefunded > 0 && (
              <span className={styles.refundedNote}>
                ({t("orders.modal.originalAmount") || "Original"}: {formatCurrency(order.totalAmount)}, {t("orders.modal.refunded") || "Refunded"}: {formatCurrency(totalRefunded)})
              </span>
            )}
          </div>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>
            <Calendar className={styles.inlineIcon} />
            {t("orders.modal.orderDate") || "Order Date"}:
          </span>
          <span className={styles.infoValue}>{formatDate(order.orderDate)}</span>
        </div>
        {order.shippedDate && (
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>
              <Truck className={styles.inlineIcon} />
              {t("orders.modal.shippedDate") || "Shipped Date"}:
            </span>
            <span className={styles.infoValue}>{formatDate(order.shippedDate)}</span>
          </div>
        )}
        {order.deliveredDate && (
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>
              <Truck className={styles.inlineIcon} />
              {t("orders.modal.deliveredDate") || "Delivered Date"}:
            </span>
            <span className={styles.infoValue}>{formatDate(order.deliveredDate)}</span>
          </div>
        )}
        {order.trackingNumber && (
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>
              {t("orders.modal.trackingNumber") || "Tracking Number"}:
            </span>
            <code className={styles.infoValue}>{order.trackingNumber}</code>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderInfoSection;

