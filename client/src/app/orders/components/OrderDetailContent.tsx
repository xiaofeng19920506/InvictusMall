import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Order } from "@/lib/server-api";
import Link from "next/link";
import {
  getOrderStatusBadgeStyle,
  getOrderStatusLabel,
} from "../orderStatusConfig";

interface OrderDetailContentProps {
  initialOrder: Order | null;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function OrderDetailContent({ initialOrder }: OrderDetailContentProps) {
  if (!initialOrder) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              Order not found.
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const order = initialOrder;
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <Link
              href="/orders"
              className="text-orange-500 hover:text-orange-600 mb-4 inline-block cursor-pointer"
            >
              ← Back to Orders
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
          </div>

          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2 break-all">
                    Order #{order.id}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Placed on {formatDate(order.orderDate)}
                  </p>
                </div>
                <div className="mt-4 md:mt-0">
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-medium ${getOrderStatusBadgeStyle(
                      order.status
                    )}`}
                  >
                    {getOrderStatusLabel(order.status)}
                  </span>
                </div>
              </div>

              {/* Store Info */}
              <div className="border-t border-gray-200 pt-4 mb-4">
                <p className="text-sm font-medium text-gray-900 mb-1">Store:</p>
                <p className="text-gray-700">{order.storeName}</p>
              </div>

              {/* Order Items */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex gap-4 border-b border-gray-100 pb-4 last:border-0">
                      {item.productImage && (
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-20 h-20 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.productName}</h4>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        <p className="text-sm text-gray-600">Unit Price: ${item.price.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          ${item.subtotal.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Total */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total:</span>
                  <span className="text-2xl font-bold text-orange-500">
                    ${order.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Shipping Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipping Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Shipping Address</p>
                  <div className="text-gray-700">
                    <p>{order.shippingAddress.streetAddress}</p>
                    {order.shippingAddress.aptNumber && (
                      <p>Apt {order.shippingAddress.aptNumber}</p>
                    )}
                    <p>
                      {order.shippingAddress.city}, {order.shippingAddress.stateProvince}{' '}
                      {order.shippingAddress.zipCode}
                    </p>
                    <p>{order.shippingAddress.country}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Payment Method</p>
                  <p className="text-gray-700">{order.paymentMethod}</p>
                  {order.shippedDate && (
                    <>
                      <p className="text-sm font-medium text-gray-500 mt-4 mb-2">Shipped Date</p>
                      <p className="text-gray-700">{formatDate(order.shippedDate)}</p>
                    </>
                  )}
                  {order.deliveredDate && (
                    <>
                      <p className="text-sm font-medium text-gray-500 mt-4 mb-2">Delivered Date</p>
                      <p className="text-gray-700">{formatDate(order.deliveredDate)}</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Tracking Information */}
            {order.trackingNumber && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tracking Information</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 mb-1">Tracking Number</p>
                    <p className="text-gray-900 font-mono">{order.trackingNumber}</p>
                  </div>
                  <button className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors cursor-pointer">
                    Track Package
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              {order.status === 'delivered' && (
                <button className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors cursor-pointer">
                  Write Review
                </button>
              )}
              {order.status === 'shipped' && (
                <button className="flex-1 bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors cursor-pointer">
                  Track Package
                </button>
              )}
              {(order.status === 'pending' || order.status === 'processing') && (
                <button className="flex-1 bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors cursor-pointer">
                  Cancel Order
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}




