"use client";

import { getImageUrl, getPlaceholderImage, handleImageError } from "@/utils/imageUtils";
import type { CartItem } from "@/contexts/CartContext";
import type { ShippingAddress } from "@/lib/server-api";
import styles from "./ReviewOrderStep.module.scss";

interface ReviewOrderStepProps {
  items: CartItem[];
  shippingAddress: ShippingAddress | {
    fullName: string;
    phoneNumber: string;
    streetAddress: string;
    aptNumber?: string;
    city: string;
    stateProvince: string;
    zipCode: string;
    country: string;
  } | undefined;
  isAuthenticated: boolean;
  onPlaceOrder: () => void;
  onBack: () => void;
  onBackToDelivery?: () => void;
  isProcessing: boolean;
}

export default function ReviewOrderStep({
  items,
  shippingAddress,
  isAuthenticated,
  onPlaceOrder,
  isProcessing,
  onBack,
  onBackToDelivery,
}: ReviewOrderStepProps) {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>
        Review your order
      </h2>

      {/* Shipping Address Review */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Shipping Address</h3>
          {onBackToDelivery && (
            <button
              onClick={onBackToDelivery}
              className={styles.changeButton}
            >
              Change
            </button>
          )}
        </div>
        {shippingAddress && (
          <div className={styles.addressContent}>
            <p className={styles.addressName}>
              {shippingAddress.fullName}
            </p>
            <p>{shippingAddress.streetAddress}</p>
            {shippingAddress.aptNumber && <p>{shippingAddress.aptNumber}</p>}
            <p>
              {shippingAddress.city}, {shippingAddress.stateProvince} {shippingAddress.zipCode}
            </p>
            <p>{shippingAddress.country}</p>
          </div>
        )}
      </div>

      {/* Payment Method Review */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Payment Method</h3>
          {onBack && (
            <button
              onClick={onBack}
              className={styles.changeButton}
            >
              Change
            </button>
          )}
        </div>
        <p className={styles.paymentInfo}>Credit or Debit Card</p>
        <p className={styles.paymentNote}>Payment already processed</p>
      </div>

      {/* Items Review */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 className={styles.sectionTitle} style={{ marginBottom: '1rem' }}>Items</h3>
        <div className={styles.itemsList}>
          {items.map((item) => (
            <div key={item.id} className={styles.itemCard}>
              {item.productImage ? (
                <img
                  src={getImageUrl(item.productImage) || getPlaceholderImage()}
                  alt={item.productName}
                  className={styles.itemImage}
                  onError={handleImageError}
                />
              ) : (
                <div className={styles.itemImagePlaceholder}>
                  <span>No Image</span>
                </div>
              )}
              <div className={styles.itemDetails}>
                <p className={styles.itemName}>{item.productName}</p>
                <p className={styles.itemStore}>{item.storeName}</p>
                {item.isReservation && item.reservationDate && item.reservationTime && (
                  <div className={styles.reservationInfo}>
                    <p>
                      📅 {new Date(item.reservationDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                    <p>
                      🕐 {new Date(`2000-01-01T${item.reservationTime}`).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                )}
                <p className={styles.itemQuantity}>Quantity: {item.quantity}</p>
              </div>
              <div className={styles.itemPrice}>
                <p className={styles.itemPriceAmount}>
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Place Order Button */}
      <div className={styles.actionBar}>
        <button
          onClick={onBack}
          className={styles.backButton}
        >
          Back
        </button>
        <button
          onClick={onPlaceOrder}
          disabled={isProcessing}
          className={styles.placeOrderButton}
        >
          {isProcessing ? "Processing..." : "Place your order"}
        </button>
      </div>

      <p className={styles.termsNotice}>
        By placing your order, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}

