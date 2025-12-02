import Header from "@/components/common/Header";
import OrdersPageWrapper from "./OrdersPageWrapper";
import OrdersStatusFilter from "./OrdersStatusFilter";
import OrdersList from "./OrdersList";
import OrdersEmptyState from "./OrdersEmptyState";
import { Order } from "@/lib/server-api";
import type { OrderStatusTabValue } from "../orderStatusConfig";
import styles from "./OrdersContent.module.scss";

interface OrdersContentProps {
  orders: Order[];
  status: OrderStatusTabValue;
}

export default function OrdersContent({
  orders,
  status,
}: OrdersContentProps) {
  return (
    <OrdersPageWrapper>
      <div className={styles.pageContainer}>
        <Header />
        <main className={styles.main}>
          <div className={styles.header}>
            <h1 className={styles.title}>My Orders</h1>
            <p className={styles.subtitle}>
              View and track your recent purchases.
            </p>
          </div>

          <OrdersStatusFilter activeStatus={status} />

          {orders.length > 0 ? (
            <OrdersList orders={orders} />
          ) : (
            <OrdersEmptyState status={status} />
          )}
        </main>
      </div>
    </OrdersPageWrapper>
  );
}

