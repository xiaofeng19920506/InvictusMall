import Header from "@/components/common/Header";
import OrdersPageWrapper from "./OrdersPageWrapper";
import OrdersStatusFilter from "./OrdersStatusFilter";
import OrdersList from "./OrdersList";
import OrdersEmptyState from "./OrdersEmptyState";
import { Order } from "@/lib/server-api";
import type { OrderStatusTabValue } from "../orderStatusConfig";

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
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
            <p className="text-gray-600 mt-2">
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

