"use client";

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
    month: "short",
    day: "numeric",
  });
}

function formatShortDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

function formatOrderId(orderId: string): string {
  // Show first 8 characters for better readability
  if (orderId.length > 12) {
    return orderId.substring(0, 12) + '...';
  }
  return orderId;
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
          {/* Order Header Section */}
          <div className={styles.orderHeader}>
            <div className={styles.orderHeaderTop}>
              <div className={styles.orderInfoLeft}>
                <p className={styles.orderDateLabel}>Order Date: {formatShortDate(order.orderDate)}</p>
              </div>
              <div className={styles.orderHeaderRight}>
                <Link
                  href={`/orders/${order.id}`}
                  className={styles.orderDetailsButton}
                >
                  ORDER DETAILS / INVOICE
                </Link>
              </div>
            </div>

            <div className={styles.orderHeaderBottom}>
              <div className={styles.orderTotal}>
                <span className={styles.orderTotalLabel}>Order Total: </span>
                <span className={styles.totalAmount}>
                  ${order.totalAmount.toFixed(2)}
                </span>
              </div>
              <div className={styles.orderNumber}>
                <span className={styles.orderNumberLabel}>ORDER # </span>
                <span className={styles.orderNumberValue}>{formatOrderId(order.id)}</span>
              </div>
              <div className={styles.orderStatus}>
                <span
                  className={`${styles.statusBadge} ${getOrderStatusBadgeStyle(
                    order.status
                  )}`}
                >
                  {getOrderStatusLabel(order.status)}
                </span>
              </div>
            </div>
          </div>

          {/* Products Section */}
          <div className={styles.productsSection}>
            {order.items.map((item) => (
              <div key={item.id} className={styles.productCard}>
                <div className={styles.productMain}>
                  <div className={styles.productImageWrapper}>
                    {item.productImage ? (
                      <img
                        src={getImageUrl(item.productImage) || getPlaceholderImage()}
                        alt={item.productName}
                        className={styles.productImage}
                        onError={handleImageError}
                      />
                    ) : (
                      <div className={styles.productImagePlaceholder}>
                        <span>No Image</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.productInfo}>
                    <h4 className={styles.productName}>{item.productName}</h4>
                    <p className={styles.productStore}>
                      Sold and Shipped by {order.storeName}
                    </p>
                    <div className={styles.productQuantity}>
                      Quantity: {item.quantity}
                    </div>
                  </div>
                  <div className={styles.productPrice}>
                    ${item.subtotal.toFixed(2)}
                  </div>
                </div>
                <div className={styles.productActions}>
                  <Link
                    href={`/orders/${order.id}`}
                    className={styles.productActionButton}
                  >
                    VIEW DETAILS
                  </Link>
                  <button
                    type="button"
                    className={styles.productActionButton}
                    onClick={() => {
                      // TODO: Implement buy again functionality
                    }}
                  >
                    BUY AGAIN
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Tracking Section */}
          {order.trackingNumber && (
            <div className={styles.trackingSection}>
              <p className={styles.trackingText}>
                <span className={styles.trackingLabel}>Tracking Number:</span>{" "}
                {order.trackingNumber}
              </p>
            </div>
          )}

          {/* Order Dates */}
          {(order.shippedDate || order.deliveredDate) && (
            <div className={styles.orderDates}>
              {order.shippedDate && (
                <p className={styles.orderDateInfo}>
                  Shipped on {formatDate(order.shippedDate)}
                </p>
              )}
              {order.deliveredDate && (
                <p className={styles.orderDateInfo}>
                  Delivered on {formatDate(order.deliveredDate)}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}


