import Link from "next/link";
import {
  ORDER_STATUS_FILTERS,
  type OrderStatusTabValue,
} from "../orderStatusConfig";

function buildStatusHref(status: string) {
  return status === "all" ? "/orders" : `/orders?status=${status}`;
}

export default function OrdersStatusFilter({
  activeStatus,
}: {
  activeStatus: OrderStatusTabValue;
}) {
  return (
    <nav className="flex flex-wrap gap-2 border-b border-gray-200 pb-4">
      {ORDER_STATUS_FILTERS.map((option) => {
        const isActive = activeStatus === option.value;
        return (
          <Link
            key={option.value}
            href={buildStatusHref(option.value)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              isActive
                ? "bg-orange-500 text-white shadow"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            prefetch={false}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}

