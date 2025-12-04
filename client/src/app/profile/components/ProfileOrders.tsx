"use client";

import { useState, useEffect, useRef } from "react";
import OrdersList from "../../orders/components/OrdersList";
import OrdersEmptyState from "../../orders/components/OrdersEmptyState";
import { Order } from "@/lib/server-api";
import { parseOrderStatusQuery, type OrderStatusTabValue } from "../../orders/orderStatusConfig";
import { orderService } from "@/services/order";
import styles from "./ProfileOrders.module.scss";

interface ProfileOrdersProps {
  initialOrders: Order[];
  initialStatus: OrderStatusTabValue;
}

export default function ProfileOrders({ initialOrders, initialStatus }: ProfileOrdersProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<OrderStatusTabValue>(initialStatus);
  // Track which status we've already fetched for to avoid duplicate calls
  const attemptedFetchRef = useRef<OrderStatusTabValue | null>(null);

  useEffect(() => {
    setSelectedStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    setOrders(initialOrders);
    // Reset the fetch ref when initialStatus changes (new data from server)
    attemptedFetchRef.current = initialStatus;
  }, [initialOrders, initialStatus]);

  useEffect(() => {
    // Skip fetch if:
    // 1. We've already attempted fetch for this status
    // 2. The selected status matches initialStatus (server already provided the data)
    const shouldSkipFetch =
      attemptedFetchRef.current === selectedStatus ||
      (selectedStatus === initialStatus && initialOrders.length >= 0);

    if (shouldSkipFetch) {
      return;
    }

    // Mark that we're about to fetch for this status
    attemptedFetchRef.current = selectedStatus;

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
  }, [initialOrders, initialStatus, selectedStatus]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>My Orders</h2>
        <p className={styles.subtitle}>
          View and track your recent purchases.
        </p>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Loading orders...</p>
        </div>
      ) : error ? (
        <div className={styles.errorMessage}>{error}</div>
      ) : orders.length > 0 ? (
        <OrdersList orders={orders} />
      ) : (
        <OrdersEmptyState status={selectedStatus} />
      )}
    </div>
  );
}

