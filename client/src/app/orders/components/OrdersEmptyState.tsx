import Link from "next/link";
import {
  getOrderStatusLabel,
  type OrderStatusTabValue,
} from "../orderStatusConfig";
import styles from "./OrdersEmptyState.module.scss";

interface OrdersEmptyStateProps {
  status: OrderStatusTabValue;
}

export default function OrdersEmptyState({ status }: OrdersEmptyStateProps) {
  return (
    <div className={styles.container}>
      <div className={styles.icon}>📦</div>
      <h3 className={styles.title}>
        No orders found
      </h3>
      <p className={styles.message}>
        {status !== "all"
          ? `You don't have any ${getOrderStatusLabel(status)} orders.`
          : "You haven't placed any orders yet."}
      </p>
      <Link
        href="/"
        className={styles.button}
      >
        Start Shopping
      </Link>
    </div>
  );
}


