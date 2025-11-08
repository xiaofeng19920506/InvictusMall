import { Order } from "@/lib/server-api";
import Link from "next/link";

interface OrdersListProps {
  orders: Order[];
}

function getStatusColor(status: string) {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "processing":
      return "bg-blue-100 text-blue-800";
    case "shipped":
      return "bg-purple-100 text-purple-800";
    case "delivered":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function OrdersList({ orders }: OrdersListProps) {
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <div className="text-6xl mb-4">📦</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No orders found
        </h3>
        <p className="text-gray-600 mb-6">You haven't placed any orders yet.</p>
        <Link
          href="/"
          className="inline-block bg-orange-500 text-white px-6 py-2 rounded-md hover:bg-orange-600 transition-colors"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <div>
              <div className="flex items-center space-x-4 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  Order #{order.id.slice(0, 8)}
                </h3>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    order.status
                  )}`}
                >
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Placed on {formatDate(order.orderDate)}
              </p>
              {order.shippedDate && (
                <p className="text-sm text-gray-600">
                  Shipped on {formatDate(order.shippedDate)}
                </p>
              )}
              {order.deliveredDate && (
                <p className="text-sm text-gray-600">
                  Delivered on {formatDate(order.deliveredDate)}
                </p>
              )}
            </div>
            <div className="mt-4 md:mt-0 text-right">
              <p className="text-lg font-bold text-gray-900">
                ${order.totalAmount.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">{order.items.length} item(s)</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-900 mb-2">
                From: {order.storeName}
              </p>
              <div className="space-y-1">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center space-x-3">
                      {item.productImage && (
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div>
                        <p className="text-gray-900">{item.productName}</p>
                        <p className="text-gray-500">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="text-gray-900 font-medium">
                      ${item.subtotal.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {order.trackingNumber && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Tracking Number:</span>{" "}
                  {order.trackingNumber}
                </p>
              </div>
            )}

            <div className="mt-4">
              <Link
                href={`/orders/${order.id}`}
                className="text-sm text-orange-500 hover:text-orange-600 font-medium"
              >
                View Details
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


