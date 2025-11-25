import React from "react";
import { useTranslation } from "react-i18next";
import { Package, Calendar, Clock, ArrowLeft } from "lucide-react";
import { type Order, type OrderReturn } from "../../../services/api";
import { getImageUrl } from "../../../shared/utils/imageUtils";
import styles from "../OrderDetailModal.module.css";

interface OrderItemsSectionProps {
  order: Order;
  refundedItemIds: Set<string>;
  orderReturns: OrderReturn[];
  formatCurrency: (amount: number, currency?: string) => string;
  formatTime: (timeString: string) => string;
  onRequestReturn: (item: Order["items"][0]) => void;
}

const OrderItemsSection: React.FC<OrderItemsSectionProps> = ({
  order,
  refundedItemIds,
  orderReturns,
  formatCurrency,
  formatTime,
  onRequestReturn,
}) => {
  const { t } = useTranslation();

  return (
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
                <div className={styles.itemBadges}>
                  {refundedItemIds.has(item.id) ? (
                    <span className={styles.refundedBadge}>
                      {t("orders.refund.refunded") || "Refunded"}
                    </span>
                  ) : null}
                  {(() => {
                    const itemReturn = orderReturns.find(r => r.orderItemId === item.id);
                    if (itemReturn) {
                      return (
                        <span className={styles.returnBadge} data-status={itemReturn.status}>
                          {t(`orders.return.status.${itemReturn.status}`) || itemReturn.status}
                        </span>
                      );
                    }
                    return null;
                  })()}
                  {!refundedItemIds.has(item.id) && !orderReturns.find(r => r.orderItemId === item.id) && item.isReservation && (
                    <span className={styles.reservationBadge}>
                      {t("orders.reservation") || "Reservation"}
                    </span>
                  )}
                </div>
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
              {!refundedItemIds.has(item.id) && !orderReturns.find(r => r.orderItemId === item.id && (r.status === 'pending' || r.status === 'approved')) && (
                <div className={styles.itemActions}>
                  <button
                    type="button"
                    onClick={() => onRequestReturn(item)}
                    className={styles.returnButton}
                  >
                    <ArrowLeft className={styles.returnButtonIcon} />
                    {t("orders.return.requestReturn") || "Request Return"}
                  </button>
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
  );
};

export default OrderItemsSection;

