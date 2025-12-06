"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import Header from "@/components/common/Header";
import { Order } from "@/lib/server-api";
import Link from "next/link";
import { getImageUrl, getPlaceholderImage, handleImageError } from "@/utils/imageUtils";
import {
  getOrderStatusBadgeStyle,
  getOrderStatusLabel,
} from "../orderStatusConfig";
import ReviewModal from "./ReviewModal";
import { apiService } from "@/services/api";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
    image?: string;
  } | null>(null);
  const [order, setOrder] = useState<Order | null>(initialOrder);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (!order) {
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

  const handleWriteReview = (item: typeof order.items[0]) => {
    setSelectedProduct({
      id: item.productId,
      name: item.productName,
      image: getImageUrl(item.productImage) || undefined,
    });
    setReviewModalOpen(true);
  };

  const handleReviewSuccess = () => {
    // Optionally refresh order data or show success message
    window.location.reload();
  };

  const handleCancelOrder = async () => {
    if (!order) return;

    setIsCancelling(true);
    try {
      const response = await apiService.cancelOrder(order.id);
      if (response.success && response.data) {
        // Update order status locally - this will automatically hide the cancel button
        setOrder(response.data);
        setShowCancelConfirm(false);
        // Refresh the page after a short delay to show updated status
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        alert(response.message || 'Failed to cancel order');
      }
    } catch (error: any) {
      alert(error.message || 'An error occurred while cancelling the order');
    } finally {
      setIsCancelling(false);
    }
  };

  if (!order) {
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
                              <p className={styles.reservationNote}>
                                Notes: {(item as any).reservationNotes}
                              </p>
                            )}
                          </div>
                        )}
                        {order.status === 'delivered' && !(item as any).isReservation && (
                          <button
                            className={styles.reviewItemButton}
                            onClick={() => handleWriteReview(item)}
                          >
                            Write Review
                          </button>
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
              {order.status === 'shipped' && (
                <button className={`${styles.actionButton} ${styles.green}`}>
                  Track Package
                </button>
              )}
              {(order.status === 'pending' || order.status === 'processing') && (
                <>
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className={`${styles.actionButton} ${styles.red}`}
                    disabled={isCancelling}
                  >
                    {isCancelling ? 'Cancelling...' : 'Cancel Order'}
                  </button>
                  {showCancelConfirm && (
                    <div className={styles.confirmModal}>
                      <div className={styles.confirmModalContent}>
                        <h3>Cancel Order?</h3>
                        <p>Are you sure you want to cancel this order? This action cannot be undone.</p>
                        <div className={styles.confirmModalActions}>
                          <button
                            onClick={() => setShowCancelConfirm(false)}
                            className={styles.confirmButton}
                            disabled={isCancelling}
                          >
                            No, Keep Order
                          </button>
                          <button
                            onClick={handleCancelOrder}
                            className={`${styles.confirmButton} ${styles.danger}`}
                            disabled={isCancelling}
                          >
                            {isCancelling ? 'Cancelling...' : 'Yes, Cancel Order'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Review Modal */}
      {selectedProduct && (
        <ReviewModal
          isOpen={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setSelectedProduct(null);
          }}
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          productImage={selectedProduct.image}
          orderId={order.id}
          onSuccess={handleReviewSuccess}
        />
      )}
    </ProtectedRoute>
  );
}




