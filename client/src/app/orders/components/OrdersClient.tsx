'use client';

import { useState, useEffect, useRef } from "react";
import { orderService, Order } from "@/services/order";
import Link from "next/link";
import {
  ORDER_STATUS_FILTERS,
  getOrderStatusBadgeStyle,
  getOrderStatusLabel,
  type OrderStatusTabValue,
} from "../orderStatusConfig";
import styles from "./OrdersClient.module.scss";

interface OrdersClientProps {
  initialOrders: Order[];
  initialStatus: OrderStatusTabValue;
}

export default function OrdersClient({
  initialOrders,
  initialStatus,
}: OrdersClientProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<OrderStatusTabValue>(initialStatus);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  const attemptedInitialFetchRef = useRef(false);

  useEffect(() => {
    const shouldSkipInitialFetch =
      !attemptedInitialFetchRef.current &&
      initialOrders.length > 0 &&
      selectedStatus === initialStatus;

    if (shouldSkipInitialFetch) {
      attemptedInitialFetchRef.current = true;
      return;
    }

    attemptedInitialFetchRef.current = true;

    let isMounted = true;
    const fetchOrders = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await orderService.getOrderHistory({
          status: selectedStatus !== "all" ? selectedStatus : undefined,
          limit: 50,
        });
        if (!isMounted) return;

        if (response.success) {
          const fetchedOrders = response.data || [];
          setOrders(fetchedOrders);
        } else {
          setError("Failed to load orders");
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || "Failed to load orders");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchOrders();

    return () => {
      isMounted = false;
    };
  }, [initialOrders.length, initialStatus, selectedStatus]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <>
      <div className={styles.container}>
        <nav className={styles.nav}>
          {ORDER_STATUS_FILTERS.map((tab) => {
            const isActive = selectedStatus === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setSelectedStatus(tab.value)}
                className={`${styles.tabButton} ${
                  isActive ? styles.active : styles.inactive
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Loading orders...</p>
        </div>
      ) : error ? (
        <div className={styles.errorMessage}>{error}</div>
      ) : orders.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📦</div>
          <h3 className={styles.emptyTitle}>No orders found</h3>
          <p className={styles.emptyMessage}>
            {selectedStatus !== "all"
              ? `You don't have any ${getOrderStatusLabel(selectedStatus)} orders.`
              : "You haven't placed any orders yet."}
          </p>
          <Link
            href="/"
            className={styles.shopButton}
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className={styles.ordersList}>
          {orders.map(order => (
            <div key={order.id} className={styles.orderCard}>
              <div className={styles.orderHeader}>
                <div>
                  <div className={styles.orderInfo}>
                    <h3 className={styles.orderTitle}>
                      Order #{order.id}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getOrderStatusBadgeStyle(
                        order.status
                      )}`}
                    >
                      {getOrderStatusLabel(order.status)}
                    </span>
                  </div>
                  <p className={styles.orderDate}>Placed on {formatDate(order.orderDate)}</p>
                  {order.shippedDate && (
                    <p className={styles.orderDate}>Shipped on {formatDate(order.shippedDate)}</p>
                  )}
                  {order.deliveredDate && (
                    <p className={styles.orderDate}>Delivered on {formatDate(order.deliveredDate)}</p>
                  )}
                </div>
                <div className={styles.orderTotal}>
                  <p className={styles.totalAmount}>${order.totalAmount.toFixed(2)}</p>
                  <p className={styles.itemCount}>{order.items.length} item(s)</p>
                </div>
              </div>

              <div className={styles.orderDivider}>
                <div style={{ marginBottom: '1rem' }}>
                  <p className={styles.storeName}>From: {order.storeName}</p>
                  <div className={styles.itemsList}>
                    {order.items.map(item => (
                      <div key={item.id} className={styles.orderItem}>
                        <div className={styles.itemDetails}>
                          {item.productImage && (
                            <img src={item.productImage} alt={item.productName} className={styles.itemImage} />
                          )}
                          <div>
                            <p className={styles.itemName}>{item.productName}</p>
                            <p className={styles.itemQuantity}>Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <p className={styles.itemSubtotal}>${item.subtotal.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {order.trackingNumber && (
                  <div className={styles.trackingSection}>
                    <p className={styles.trackingText}>
                      <span className={styles.trackingLabel}>Tracking Number:</span> {order.trackingNumber}
                    </p>
                  </div>
                )}

                <div className={styles.orderActions}>
                  <Link
                    href={`/orders/${order.id}`}
                    className={styles.actionLink}
                  >
                    View Details
                  </Link>
                  {order.status === 'delivered' && (
                    <button className={`${styles.actionLink} ${styles.blue}`}>
                      Write Review
                    </button>
                  )}
                  {order.status === 'shipped' && (
                    <button className={`${styles.actionLink} ${styles.green}`}>
                      Track Package
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

