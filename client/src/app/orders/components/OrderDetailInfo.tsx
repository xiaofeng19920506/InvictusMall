"use client";

import { Order } from "@/lib/server-api";
import Link from "next/link";
import { getImageUrl } from "@/utils/imageUtils";
import {
  getImageUrl,
  getPlaceholderImage,
  handleImageError,
} from "@/utils/imageUtils";
import {
  getOrderStatusBadgeStyle,
  getOrderStatusLabel,
} from "../orderStatusConfig";
import styles from "./OrderDetailInfo.module.scss";

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
    <div className={styles.container}>
      {/* Order Header */}
      <div className={styles.orderHeaderCard}>
        <div className={styles.orderHeader}>
          <div>
            <div className={styles.orderInfo}>
              <h1 className={styles.orderTitle}>Order #{order.id}</h1>
              <span
                className={`${styles.statusBadge} ${getOrderStatusBadgeStyle(
                  order.status
                )}`}
              >
                {getOrderStatusLabel(order.status)}
              </span>
            </div>
            <div className={styles.orderMeta}>
              <p className={styles.metaText}>
                Placed on {formatDate(order.orderDate)}
              </p>
              {order.shippedDate && (
                <p className={styles.metaText}>
                  Shipped on {formatDate(order.shippedDate)}
                </p>
              )}
              {order.deliveredDate && (
                <p className={styles.metaText}>
                  Delivered on {formatDate(order.deliveredDate)}
                </p>
              )}
            </div>
          </div>
          <div className={styles.orderTotal}>
            <p className={styles.totalAmount}>
              ${order.totalAmount.toFixed(2)}
            </p>
            <p className={styles.totalLabel}>{order.items.length} item(s)</p>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className={styles.itemsCard}>
        <h2 className={styles.itemsTitle}>Order Items</h2>
        <div className={styles.itemsList}>
          {order.items.map((item) => (
<<<<<<< HEAD
            <div
              key={item.id}
              className="flex items-center justify-between border-b border-gray-200 pb-4 last:border-0 last:pb-0"
            >
              <div className="flex items-center space-x-4">
                {item.productImage ? (
                  <img
                    src={getImageUrl(item.productImage)}
                    alt={item.productName}
                    className="w-20 h-20 object-cover rounded"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = "/placeholder/product.png";
                    }}
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center">
                    <span className="text-gray-400 text-xs">No Image</span>
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    {item.productName}
                  </p>
                  <p className="text-sm text-gray-600">
=======
            <div key={item.id} className={styles.itemRow}>
              <div className={styles.itemLeft}>
                <img
                  src={getImageUrl(item.productImage) || getPlaceholderImage()}
                  alt={item.productName}
                  className={styles.itemImage}
                  onError={handleImageError}
                />
                <div className={styles.itemInfo}>
                  <p className={styles.itemName}>{item.productName}</p>
                  <p className={styles.itemDetails}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                    Quantity: {item.quantity}
                  </p>
                  <p className={styles.itemDetails}>
                    ${item.price.toFixed(2)} each
                  </p>
<<<<<<< HEAD
                  {(item as any).isReservation && (item as any).reservationDate && (item as any).reservationTime && (
                    <div className="mt-2 text-sm text-gray-600">
                      <p>
                        📅 {new Date((item as any).reservationDate).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                      <p>
                        🕐 {new Date(`2000-01-01T${(item as any).reservationTime}`).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </p>
                      {(item as any).reservationNotes && (
                        <p className="mt-1 text-xs text-gray-500">
                          Notes: {(item as any).reservationNotes}
                        </p>
                      )}
                    </div>
                  )}
=======
                  {(item as any).isReservation &&
                    (item as any).reservationDate &&
                    (item as any).reservationTime && (
                      <div className={styles.reservationInfo}>
                        <p>
                          📅{" "}
                          {new Date(
                            (item as any).reservationDate
                          ).toLocaleDateString("en-US", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        <p>
                          🕐{" "}
                          {new Date(
                            `2000-01-01T${(item as any).reservationTime}`
                          ).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </p>
                        {(item as any).reservationNotes && (
                          <p className={styles.reservationNote}>
                            Notes: {(item as any).reservationNotes}
                          </p>
                        )}
                      </div>
                    )}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                </div>
              </div>
              <p className={styles.itemPrice}>${item.subtotal.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Shipping Information */}
      <div className={styles.shippingCard}>
        <h2 className={styles.shippingTitle}>Shipping Information</h2>
        <div className={styles.shippingInfo}>
          <p className={styles.shippingText}>
            {order.shippingAddress.streetAddress}
            {order.shippingAddress.aptNumber &&
              `, ${order.shippingAddress.aptNumber}`}
          </p>
          <p className={styles.shippingText}>
            {order.shippingAddress.city}, {order.shippingAddress.stateProvince}{" "}
            {order.shippingAddress.zipCode}
          </p>
          <p className={styles.shippingText}>{order.shippingAddress.country}</p>
        </div>
      </div>

      {/* Payment Information */}
      <div className={styles.paymentCard}>
        <h2 className={styles.paymentTitle}>Payment Information</h2>
        <div className={styles.paymentInfo}>
          <div className={styles.paymentRow}>
            <span className={styles.paymentLabel}>Payment Method:</span>
            <span className={styles.paymentValue}>{order.paymentMethod}</span>
          </div>
          <div className={styles.paymentRow}>
            <span className={styles.paymentLabel}>Total Amount:</span>
            <span className={`${styles.paymentValue} ${styles.total}`}>
              ${order.totalAmount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Tracking Information */}
      {order.trackingNumber && (
        <div className={styles.trackingCard}>
          <h2 className={styles.trackingTitle}>Tracking Information</h2>
          <div className={styles.trackingInfo}>
            <p className={styles.trackingText}>
              <span className={styles.trackingLabel}>Tracking Number:</span>{" "}
              {order.trackingNumber}
            </p>
            {order.status === "shipped" && (
              <p className={`${styles.trackingStatus} ${styles.shipped}`}>
                Your order has been shipped and is on its way!
              </p>
            )}
            {order.status === "delivered" && (
              <p className={`${styles.trackingStatus} ${styles.delivered}`}>
                Your order has been delivered!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <Link href="/profile?tab=orders&orderStatus=all" className={styles.backButton}>
          Back to Orders
        </Link>
        {order.status === "delivered" && (
          <button className={styles.reviewButton}>Write Review</button>
        )}
      </div>
    </div>
  );
}
