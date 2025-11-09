import { Order } from "@/lib/server-api";
import Link from "next/link";
import {
  getOrderStatusBadgeStyle,
  getOrderStatusLabel,
} from "../orderStatusConfig";

interface OrderDetailInfoProps {
  order: Order;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderDetailInfo({ order }: OrderDetailInfoProps) {
  return (
    <div className="space-y-6">
      {/* Order Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <div className="flex items-center space-x-4 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 break-all">
                Order #{order.id}
              </h1>
              <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${getOrderStatusBadgeStyle(
                  order.status
                )}`}
              >
              {getOrderStatusLabel(order.status)}
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
            <p className="text-2xl font-bold text-gray-900">
              ${order.totalAmount.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">
              {order.items.length} item(s)
            </p>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Order Items
        </h2>
        <div className="space-y-4">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border-b border-gray-200 pb-4 last:border-0 last:pb-0"
            >
              <div className="flex items-center space-x-4">
                {item.productImage && (
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-20 h-20 object-cover rounded"
                  />
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    {item.productName}
                  </p>
                  <p className="text-sm text-gray-600">
                    Quantity: {item.quantity}
                  </p>
                  <p className="text-sm text-gray-600">
                    ${item.price.toFixed(2)} each
                  </p>
                </div>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                ${item.subtotal.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Shipping Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Shipping Information
        </h2>
        <div className="space-y-2 text-sm">
          <p className="text-gray-900">
            {order.shippingAddress.streetAddress}
            {order.shippingAddress.aptNumber &&
              `, ${order.shippingAddress.aptNumber}`}
          </p>
          <p className="text-gray-900">
            {order.shippingAddress.city}, {order.shippingAddress.stateProvince}{" "}
            {order.shippingAddress.zipCode}
          </p>
          <p className="text-gray-900">{order.shippingAddress.country}</p>
        </div>
      </div>

      {/* Payment Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Payment Information
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Payment Method:</span>
            <span className="text-gray-900 font-medium">
              {order.paymentMethod}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Amount:</span>
            <span className="text-gray-900 font-bold text-lg">
              ${order.totalAmount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Tracking Information */}
      {order.trackingNumber && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Tracking Information
          </h2>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Tracking Number:</span>{" "}
              {order.trackingNumber}
            </p>
            {order.status === "shipped" && (
              <p className="text-sm text-blue-600">
                Your order has been shipped and is on its way!
              </p>
            )}
            {order.status === "delivered" && (
              <p className="text-sm text-green-600">
                Your order has been delivered!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-4">
        <Link
          href="/orders"
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back to Orders
        </Link>
        {order.status === "delivered" && (
          <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
            Write Review
          </button>
        )}
      </div>
    </div>
  );
}
