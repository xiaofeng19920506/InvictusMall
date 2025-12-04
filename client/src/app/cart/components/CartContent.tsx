"use client";

<<<<<<< HEAD
import { useMemo } from "react";
import { useCart } from "@/contexts/CartContext";
import Header from "@/components/common/Header";
import Link from "next/link";
import { getImageUrl } from "@/utils/imageUtils";
import type { ShippingAddress } from "@/lib/server-api";
=======
import { useMemo, useCallback, memo } from "react";
import { useCart } from "@/contexts/CartContext";
import Header from "@/components/common/Header";
import Link from "next/link";
import { getImageUrl, getPlaceholderImage, handleImageError } from "@/utils/imageUtils";
import type { ShippingAddress } from "@/lib/server-api";
import type { CartItem } from "@/contexts/CartContext";
import styles from "./CartContent.module.scss";
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009

interface CartContentProps {
  addresses: ShippingAddress[];
  defaultAddressId?: string;
  beginCheckout: (payload: any) => Promise<any>;
}

<<<<<<< HEAD
=======
// Memoized cart item component for better performance
const CartItemCard = memo(function CartItemCard({
  item,
  onUpdateQuantity,
  onRemoveItem,
}: {
  item: CartItem;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
}) {
  const handleDecrease = useCallback(() => {
    onUpdateQuantity(item.id, item.quantity - 1);
  }, [item.id, item.quantity, onUpdateQuantity]);

  const handleIncrease = useCallback(() => {
    onUpdateQuantity(item.id, item.quantity + 1);
  }, [item.id, item.quantity, onUpdateQuantity]);

  const handleRemove = useCallback(() => {
    onRemoveItem(item.id);
  }, [item.id, onRemoveItem]);

  const reservationDateFormatted = useMemo(() => {
    if (!item.reservationDate) return null;
    return new Date(item.reservationDate).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, [item.reservationDate]);

  const reservationTimeFormatted = useMemo(() => {
    if (!item.reservationTime) return null;
    return new Date(`2000-01-01T${item.reservationTime}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }, [item.reservationTime]);

  const itemTotal = useMemo(() => {
    return (item.price * item.quantity).toFixed(2);
  }, [item.price, item.quantity]);

  return (
    <div className={styles.cartItem}>
      <div className={styles.itemContent}>
        {item.productImage ? (
          <img
            src={getImageUrl(item.productImage) || getPlaceholderImage()}
            alt={item.productName}
            className={styles.itemImage}
            onError={handleImageError}
          />
        ) : (
          <div className={styles.itemImagePlaceholder}>
            <span className={styles.placeholderText}>No Image</span>
          </div>
        )}
        <div className={styles.itemDetails}>
          <div className={styles.itemHeader}>
            <div className={styles.itemInfo}>
              <div className={styles.itemNameRow}>
                <h3 className={styles.itemName}>
                  {item.productName}
                </h3>
                {item.isReservation && (
                  <span className={styles.reservationBadge}>
                    Reservation
                  </span>
                )}
              </div>
              <p className={styles.storeName}>{item.storeName}</p>
              {item.isReservation && reservationDateFormatted && reservationTimeFormatted && (
                <div className={styles.reservationInfo}>
                  <p className={styles.reservationDate}>
                    📅 {reservationDateFormatted}
                  </p>
                  <p className={styles.reservationTime}>
                    🕐 {reservationTimeFormatted}
                  </p>
                  {item.reservationNotes && (
                    <p className={styles.reservationNote}>
                      Note: {item.reservationNotes}
                    </p>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={handleRemove}
              className={styles.removeButton}
            >
              ✕
            </button>
          </div>
          <div className={styles.itemFooter}>
            {!item.isReservation && (
              <div className={styles.quantityControls}>
                <button
                  onClick={handleDecrease}
                  className={styles.quantityButton}
                >
                  −
                </button>
                <span className={styles.quantityValue}>
                  {item.quantity}
                </span>
                <button
                  onClick={handleIncrease}
                  className={styles.quantityButton}
                >
                  +
                </button>
              </div>
            )}
            {item.isReservation && (
              <div className={styles.quantityText}>
                Quantity: {item.quantity}
              </div>
            )}
            <span className={styles.itemPrice}>
              ${itemTotal}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
export default function CartContent({
  addresses,
  defaultAddressId,
  beginCheckout,
}: CartContentProps) {
  const { items, updateQuantity, removeItem, clearCart } = useCart();

  const subtotal = useMemo(
    () =>
      items.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      ),
    [items]
  );

  const itemCount = useMemo(
    () => items.reduce((count, item) => count + item.quantity, 0),
    [items]
  );

<<<<<<< HEAD
=======
  const handleUpdateQuantity = useCallback((id: string, quantity: number) => {
    updateQuantity(id, quantity);
  }, [updateQuantity]);

  const handleRemoveItem = useCallback((id: string) => {
    removeItem(id);
  }, [removeItem]);

  const handleClearCart = useCallback(() => {
    clearCart();
  }, [clearCart]);

>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
  return (
    <>
      <Header />
      <div className={styles.container}>
        <h1 className={styles.title}>Shopping Cart</h1>

        {items.length === 0 ? (
          <div className={styles.emptyCart}>
            <div className={styles.emptyIcon}>🛒</div>
            <h3 className={styles.emptyTitle}>
              Your cart is empty
            </h3>
            <p className={styles.emptyMessage}>
              Start shopping to add items to your cart!
            </p>
            <Link
              href="/"
              className={styles.continueShoppingButton}
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className={styles.cartGrid}>
            <div className={styles.itemsList}>
              {items.map((item) => (
<<<<<<< HEAD
                <div key={item.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex gap-4">
                    {item.productImage ? (
                      <img
                        src={getImageUrl(item.productImage) || "/placeholder/product.png"}
                        alt={item.productName}
                        className="w-24 h-24 object-cover rounded"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = "/placeholder/product.png";
                        }}
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center">
                        <span className="text-gray-400 text-xs">No Image</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">
                              {item.productName}
                            </h3>
                            {item.isReservation && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                Reservation
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{item.storeName}</p>
                          {item.isReservation && item.reservationDate && item.reservationTime && (
                            <div className="mt-2 text-sm text-gray-600">
                              <p className="font-medium">
                                📅 {new Date(item.reservationDate).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                              <p className="text-gray-500">
                                🕐 {new Date(`2000-01-01T${item.reservationTime}`).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </p>
                              {item.reservationNotes && (
                                <p className="text-xs text-gray-500 mt-1 italic">
                                  Note: {item.reservationNotes}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700 cursor-pointer ml-2"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        {!item.isReservation && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                              }
                              className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100 cursor-pointer"
                            >
                              −
                            </button>
                            <span className="w-12 text-center font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(item.id, item.quantity + 1)
                              }
                              className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        )}
                        {item.isReservation && (
                          <div className="text-sm text-gray-600">
                            Quantity: {item.quantity}
                          </div>
                        )}
                        <span className="text-lg font-bold text-orange-500">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
=======
                <CartItemCard
                  key={item.id}
                  item={item}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemoveItem={handleRemoveItem}
                />
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
              ))}
            </div>

            <div>
              <div className={styles.summaryCard}>
                <section>
<<<<<<< HEAD
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">
=======
                  <h2 className={styles.summaryTitle}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                    Order Summary
                  </h2>

                  <div className={styles.summaryList}>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>
                        Subtotal ({itemCount} items)
                      </span>
                      <span className={styles.summaryValue}>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Shipping</span>
                      <span className={styles.summaryValue}>Calculated at checkout</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Tax</span>
                      <span className={styles.summaryValue}>Calculated at checkout</span>
                    </div>
                  </div>

                  <div className={styles.summaryDivider}>
                    <div className={styles.summaryTotal}>
                      <span>Total</span>
                      <span className={styles.totalAmount}>
                        ${subtotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </section>

                <Link
                  href="/checkout"
<<<<<<< HEAD
                  className="w-full bg-orange-500 text-white py-3 px-4 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors cursor-pointer text-center font-medium block"
=======
                  className={styles.checkoutButton}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                >
                  Proceed to Checkout
                </Link>

                <button
<<<<<<< HEAD
                  onClick={clearCart}
                  disabled={items.length === 0}
                  className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
=======
                  onClick={handleClearCart}
                  disabled={items.length === 0}
                  className={styles.clearCartButton}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                >
                  Clear Cart
                </button>

                <Link
                  href="/"
                  className={styles.continueShoppingLink}
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
