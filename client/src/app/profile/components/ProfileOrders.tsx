import OrdersStatusFilter from "../../orders/components/OrdersStatusFilter";
import OrdersList from "../../orders/components/OrdersList";
import OrdersEmptyState from "../../orders/components/OrdersEmptyState";
import { Order } from "@/lib/server-api";
import { parseOrderStatusQuery } from "../../orders/orderStatusConfig";
import styles from "./ProfileOrders.module.scss";

interface ProfileOrdersProps {
  initialOrders: Order[];
}

export default function ProfileOrders({ initialOrders }: ProfileOrdersProps) {
  // Default to "all" status for orders in profile page
  const status = parseOrderStatusQuery("all");

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>My Orders</h2>
        <p className={styles.subtitle}>
          View and track your recent purchases.
        </p>
      </div>

      <OrdersStatusFilter activeStatus={status} />

      {initialOrders.length > 0 ? (
        <OrdersList orders={initialOrders} />
      ) : (
        <OrdersEmptyState status={status} />
      )}
    </div>
  );
}

