import Link from "next/link";
import {
  getOrderStatusLabel,
  type OrderStatusTabValue,
} from "../orderStatusConfig";

interface OrdersEmptyStateProps {
  status: OrderStatusTabValue;
}

export default function OrdersEmptyState({ status }: OrdersEmptyStateProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-12 text-center">
      <div className="text-6xl mb-4">📦</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No orders found
      </h3>
      <p className="text-gray-600 mb-6">
        {status !== "all"
          ? `You don't have any ${getOrderStatusLabel(status)} orders.`
          : "You haven't placed any orders yet."}
      </p>
      <Link
        href="/"
        className="inline-block bg-orange-500 text-white px-6 py-2 rounded-md hover:bg-orange-600 transition-colors"
      >
        Start Shopping
      </Link>
    </div>
  );
}


