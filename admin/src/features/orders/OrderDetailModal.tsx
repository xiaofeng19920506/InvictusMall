import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Package, MapPin, CreditCard, Calendar, Truck, Clock } from "lucide-react";
import { type Order } from "../../services/api";
import { getImageUrl } from "../../shared/utils/imageUtils";
import styles from "./OrderDetailModal.module.css";

export interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, onClose }) => {
  const { t } = useTranslation();

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending_payment":
        return styles.statusPendingPayment;
      case "pending":
        return styles.statusPending;
      case "processing":
        return styles.statusProcessing;
      case "shipped":
        return styles.statusShipped;
      case "delivered":
        return styles.statusDelivered;
      case "cancelled":
        return styles.statusCancelled;
      default:
        return "";
    }
  };

  const formatStatus = (status: string) => {
    return t(`orders.status.${status}`) || status;
  };

  return (
    <div className={styles.backdropContainer}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div className={styles.dialog} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h3 className={styles.title}>
            {t("orders.modal.detailTitle") || "Order Details"}
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

        <div className={`${styles.content} custom-scrollbar`}>
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
                <span className={`${styles.infoValue} ${styles.totalAmount}`}>
                  {formatCurrency(order.totalAmount)}
                </span>
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

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Package className={styles.sectionIcon} />
              <h4 className={styles.sectionTitle}>
                {t("orders.modal.items") || "Order Items"} ({order.items.length})
              </h4>
            </div>
            <div className={styles.itemsList}>
              {order.items.map((item) => (
                <div key={item.id} className={styles.itemCard}>
                  {item.productImage ? (
                    <img
                      src={getImageUrl(item.productImage)}
                      alt={item.productName}
                      className={styles.itemImage}
                    />
                  ) : (
                    <div className={styles.itemImagePlaceholder}>
                      <Package className={styles.itemImageIcon} />
                    </div>
                  )}
                  <div className={styles.itemDetails}>
                    <div className={styles.itemHeader}>
                      <h5 className={styles.itemName}>{item.productName}</h5>
                      {item.isReservation && (
                        <span className={styles.reservationBadge}>
                          {t("orders.reservation") || "Reservation"}
                        </span>
                      )}
                    </div>
                    <div className={styles.itemInfo}>
                      <span className={styles.itemQuantity}>
                        {t("orders.quantity") || "Qty"}: {item.quantity}
                      </span>
                      <span className={styles.itemPrice}>
                        {formatCurrency(item.price)} × {item.quantity} ={" "}
                        {formatCurrency(item.subtotal)}
                      </span>
                    </div>
                    {item.isReservation && item.reservationDate && item.reservationTime && (
                      <div className={styles.reservationInfo}>
                        <div className={styles.reservationRow}>
                          <Calendar className={styles.reservationIcon} />
                          <span>
                            {new Date(item.reservationDate).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <div className={styles.reservationRow}>
                          <Clock className={styles.reservationIcon} />
                          <span>{formatTime(item.reservationTime)}</span>
                        </div>
                        {item.reservationNotes && (
                          <div className={styles.reservationNotes}>
                            <strong>{t("orders.modal.notes") || "Notes"}:</strong>{" "}
                            {item.reservationNotes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.itemsTotal}>
              <span className={styles.totalLabel}>
                {t("orders.modal.total") || "Total"}:
              </span>
              <span className={styles.totalValue}>
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <MapPin className={styles.sectionIcon} />
              <h4 className={styles.sectionTitle}>
                {t("orders.modal.shippingAddress") || "Shipping Address"}
              </h4>
            </div>
            <div className={styles.address}>
              <p>{order.shippingAddress.streetAddress}</p>
              {order.shippingAddress.aptNumber && (
                <p>{order.shippingAddress.aptNumber}</p>
              )}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.stateProvince}{" "}
                {order.shippingAddress.zipCode}
              </p>
              <p>{order.shippingAddress.country}</p>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <CreditCard className={styles.sectionIcon} />
              <h4 className={styles.sectionTitle}>
                {t("orders.modal.paymentInfo") || "Payment Information"}
              </h4>
            </div>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  {t("orders.modal.paymentMethod") || "Payment Method"}:
                </span>
                <span className={styles.infoValue}>{order.paymentMethod}</span>
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              {t("orders.modal.close") || "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;

