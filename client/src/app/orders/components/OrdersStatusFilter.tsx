import Link from "next/link";
import {
  ORDER_STATUS_FILTERS,
  type OrderStatusTabValue,
} from "../orderStatusConfig";
import styles from "./OrdersStatusFilter.module.scss";

function buildStatusHref(status: string) {
  return status === "all" ? "/orders" : `/orders?status=${status}`;
}

export default function OrdersStatusFilter({
  activeStatus,
}: {
  activeStatus: OrderStatusTabValue;
}) {
  return (
    <nav className={styles.nav}>
      {ORDER_STATUS_FILTERS.map((option) => {
        const isActive = activeStatus === option.value;
        return (
          <Link
            key={option.value}
            href={buildStatusHref(option.value)}
            className={`${styles.link} ${isActive ? styles.active : ''}`}
            prefetch={false}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}

