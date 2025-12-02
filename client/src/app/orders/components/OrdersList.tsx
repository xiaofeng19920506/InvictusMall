import { Order } from "@/lib/server-api";
import Link from "next/link";
import {
  getOrderStatusBadgeStyle,
  getOrderStatusLabel,
} from "../orderStatusConfig";
import { getImageUrl, getPlaceholderImage, handleImageError } from "@/utils/imageUtils";
import styles from "./OrdersList.module.scss";

interface OrdersListProps {
  orders: Order[];
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function OrdersList({ orders }: OrdersListProps) {
  if (orders.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📦</div>
        <h3 className={styles.emptyTitle}>
          No orders found
        </h3>
        <p className={styles.emptyMessage}>You haven't placed any orders yet.</p>
        <Link
          href="/"
          className={styles.startShoppingButton}
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {orders.map((order) => (
        <div key={order.id} className={styles.orderCard}>
          <div className={styles.orderHeader}>
            <div className={styles.orderInfoLeft}>
              <div className={styles.orderTitleRow}>
                <h3 className={styles.orderTitle}>
                  Order #{order.id}
                </h3>
                <span
                  className={`${styles.statusBadge} ${getOrderStatusBadgeStyle(
                    order.status
                  )}`}
                >
                  {getOrderStatusLabel(order.status)}
                </span>
              </div>
              <p className={styles.orderDate}>
                Placed on {formatDate(order.orderDate)}
              </p>
              {order.shippedDate && (
                <p className={styles.orderDate}>
                  Shipped on {formatDate(order.shippedDate)}
                </p>
              )}
              {order.deliveredDate && (
                <p className={styles.orderDate}>
                  Delivered on {formatDate(order.deliveredDate)}
                </p>
              )}
            </div>
            <div className={styles.orderTotal}>
              <p className={styles.totalAmount}>
                ${order.totalAmount.toFixed(2)}
              </p>
              <p className={styles.itemCount}>{order.items.length} item(s)</p>
            </div>
          </div>

          <div className={styles.divider}>
            <div className={styles.storeInfo}>
              <p className={styles.storeLabel}>
                From: {order.storeName}
              </p>
              <div className={styles.itemsList}>
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className={styles.orderItem}
                  >
                    <div className={styles.itemLeft}>
                      {item.productImage && (
                        <img
                          src={getImageUrl(item.productImage) || getPlaceholderImage()}
                          alt={item.productName}
                          className={styles.itemImage}
                          onError={handleImageError}
                        />
                      )}
                      <div className={styles.itemInfo}>
                        <p className={styles.itemName}>{item.productName}</p>
                        <p className={styles.itemQuantity}>Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <p className={styles.itemPrice}>
                      ${item.subtotal.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {order.trackingNumber && (
              <div className={styles.trackingSection}>
                <p className={styles.trackingText}>
                  <span className={styles.trackingLabel}>Tracking Number:</span>{" "}
                  {order.trackingNumber}
                </p>
              </div>
            )}

            <div>
              <Link
                href={`/orders/${order.id}`}
                className={styles.viewDetailsLink}
              >
                View Details
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


