"use client";

<<<<<<< HEAD
import { getImageUrl } from "@/utils/imageUtils";
import type { CartItem } from "@/contexts/CartContext";
import type { ShippingAddress } from "@/lib/server-api";
=======
import { getImageUrl, getPlaceholderImage, handleImageError } from "@/utils/imageUtils";
import type { CartItem } from "@/contexts/CartContext";
import type { ShippingAddress } from "@/lib/server-api";
import styles from "./ReviewOrderStep.module.scss";
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009

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
<<<<<<< HEAD
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
=======
    <div className={styles.container}>
      <h2 className={styles.title}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
        Review your order
      </h2>

      {/* Shipping Address Review */}
<<<<<<< HEAD
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-medium text-gray-900">Shipping Address</h3>
          {onBackToDelivery && (
            <button
              onClick={onBackToDelivery}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
=======
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Shipping Address</h3>
          {onBackToDelivery && (
            <button
              onClick={onBackToDelivery}
              className={styles.changeButton}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
            >
              Change
            </button>
          )}
        </div>
        {shippingAddress && (
<<<<<<< HEAD
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-900">
=======
          <div className={styles.addressContent}>
            <p className={styles.addressName}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
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
<<<<<<< HEAD
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-medium text-gray-900">Payment Method</h3>
          {onBack && (
            <button
              onClick={onBack}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
=======
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Payment Method</h3>
          {onBack && (
            <button
              onClick={onBack}
              className={styles.changeButton}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
            >
              Change
            </button>
          )}
        </div>
<<<<<<< HEAD
        <p className="text-sm text-gray-600">Credit or Debit Card</p>
        <p className="text-xs text-gray-500 mt-1">Payment already processed</p>
      </div>

      {/* Items Review */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Items</h3>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 pb-4 border-b border-gray-200 last:border-0">
              {item.productImage ? (
                <img
                  src={getImageUrl(item.productImage) || "/placeholder/product.png"}
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
                <p className="font-medium text-gray-900">{item.productName}</p>
                <p className="text-sm text-gray-600">{item.storeName}</p>
                {item.isReservation && item.reservationDate && item.reservationTime && (
                  <div className="mt-2 text-sm text-gray-600">
=======
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
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
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
<<<<<<< HEAD
                <p className="text-sm text-gray-600 mt-1">Quantity: {item.quantity}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">
=======
                <p className={styles.itemQuantity}>Quantity: {item.quantity}</p>
              </div>
              <div className={styles.itemPrice}>
                <p className={styles.itemPriceAmount}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Place Order Button */}
<<<<<<< HEAD
      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors font-medium"
=======
      <div className={styles.actionBar}>
        <button
          onClick={onBack}
          className={styles.backButton}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
        >
          Back
        </button>
        <button
          onClick={onPlaceOrder}
          disabled={isProcessing}
<<<<<<< HEAD
          className="bg-orange-500 text-white px-8 py-3 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition-colors font-medium text-lg"
=======
          className={styles.placeOrderButton}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
        >
          {isProcessing ? "Processing..." : "Place your order"}
        </button>
      </div>

<<<<<<< HEAD
      <p className="mt-4 text-xs text-gray-500 text-center">
=======
      <p className={styles.termsNotice}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
        By placing your order, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}

