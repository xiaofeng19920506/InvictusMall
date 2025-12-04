"use client";

import ProtectedRoute from "@/components/common/ProtectedRoute";
import Header from "@/components/common/Header";
import { Order } from "@/lib/server-api";
import Link from "next/link";
<<<<<<< HEAD
import { getImageUrl } from "@/utils/imageUtils";
=======
import { getImageUrl, getPlaceholderImage, handleImageError } from "@/utils/imageUtils";
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
import {
  getOrderStatusBadgeStyle,
  getOrderStatusLabel,
} from "../orderStatusConfig";
import styles from "./OrderDetailContent.module.scss";

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
        <div className={styles.pageContainer}>
          <div className={styles.container}>
            <div className={styles.errorMessage}>
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
      <div className={styles.wrapper}>
        <Header />
        <div className={styles.pageContainer}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <Link
              href="/profile?tab=orders&orderStatus=all"
              className={styles.backLink}
            >
              ← Back to Orders
            </Link>
            <h1 className={styles.title}>Order Details</h1>
          </div>

          <div className={styles.content}>
            {/* Order Summary */}
            <div className={styles.card}>
              <div className={styles.orderHeader}>
                <div className={styles.orderInfo}>
                  <h2 className={styles.orderTitle}>
                    Order #{order.id}
                  </h2>
                  <p className={styles.orderDate}>
                    Placed on {formatDate(order.orderDate)}
                  </p>
                </div>
                <div className={styles.statusContainer}>
                  <span
                    className={`${styles.statusBadge} ${getOrderStatusBadgeStyle(
                      order.status
                    )}`}
                  >
                    {getOrderStatusLabel(order.status)}
                  </span>
                </div>
              </div>

              {/* Store Info */}
              <div className={styles.divider}>
                <p className={styles.storeLabel}>Store:</p>
                <p className={styles.storeName}>{order.storeName}</p>
              </div>

              {/* Order Items */}
              <div className={styles.divider}>
                <h3 className={styles.itemsTitle}>Order Items</h3>
                <div className={styles.itemsList}>
                  {order.items.map((item) => (
<<<<<<< HEAD
                    <div key={item.id} className="flex gap-4 border-b border-gray-100 pb-4 last:border-0">
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
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.productName}</h4>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        <p className="text-sm text-gray-600">Unit Price: ${item.price.toFixed(2)}</p>
                        {(item as any).isReservation && (item as any).reservationDate && (item as any).reservationTime && (
                          <div className="mt-2 text-sm text-gray-600">
=======
                    <div key={item.id} className={styles.itemRow}>
                      <img
                        src={getImageUrl(item.productImage) || getPlaceholderImage()}
                        alt={item.productName}
                        className={styles.itemImage}
                        onError={handleImageError}
                      />
                      <div className={styles.itemInfo}>
                        <h4 className={styles.itemName}>{item.productName}</h4>
                        <p className={styles.itemDetail}>Quantity: {item.quantity}</p>
                        <p className={styles.itemDetail}>Unit Price: ${item.price.toFixed(2)}</p>
                        {(item as any).isReservation && (item as any).reservationDate && (item as any).reservationTime && (
                          <div className={styles.reservationInfo}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
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
<<<<<<< HEAD
                              <p className="mt-1 text-xs text-gray-500">
=======
                              <p className={styles.reservationNote}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                                Notes: {(item as any).reservationNotes}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className={styles.itemPrice}>
                        <p className={styles.priceAmount}>
                          ${item.subtotal.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Total */}
              <div className={styles.totalSection}>
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>Total:</span>
                  <span className={styles.totalAmount}>
                    ${order.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Shipping Information */}
            <div className={styles.card}>
              <h3 className={styles.sectionTitle}>Shipping Information</h3>
              <div className={styles.shippingGrid}>
                <div className={styles.shippingField}>
                  <p className={styles.shippingLabel}>Shipping Address</p>
                  <div className={styles.shippingText}>
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
                <div className={styles.shippingField}>
                  <p className={styles.shippingLabel}>Payment Method</p>
                  <p className={styles.shippingText}>{order.paymentMethod}</p>
                  {order.shippedDate && (
                    <div className={styles.shippingDateSection}>
                      <p className={styles.shippingLabel}>Shipped Date</p>
                      <p className={styles.shippingText}>{formatDate(order.shippedDate)}</p>
                    </div>
                  )}
                  {order.deliveredDate && (
                    <div className={styles.shippingDateSection}>
                      <p className={styles.shippingLabel}>Delivered Date</p>
                      <p className={styles.shippingText}>{formatDate(order.deliveredDate)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tracking Information */}
            {order.trackingNumber && (
              <div className={styles.card}>
                <h3 className={styles.sectionTitle}>Tracking Information</h3>
                <div className={styles.trackingSection}>
                  <div className={styles.trackingInfo}>
                    <p className={styles.trackingLabel}>Tracking Number</p>
                    <p className={styles.trackingNumber}>{order.trackingNumber}</p>
                  </div>
                  <button className={styles.trackButton}>
                    Track Package
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className={styles.actions}>
              {order.status === 'delivered' && (
                <button className={`${styles.actionButton} ${styles.blue}`}>
                  Write Review
                </button>
              )}
              {order.status === 'shipped' && (
                <button className={`${styles.actionButton} ${styles.green}`}>
                  Track Package
                </button>
              )}
              {(order.status === 'pending' || order.status === 'processing') && (
                <button className={`${styles.actionButton} ${styles.red}`}>
                  Cancel Order
                </button>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}




