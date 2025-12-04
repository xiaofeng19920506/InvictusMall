"use client";

import { useMemo, useCallback, memo, useState, useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import Header from "@/components/common/Header";
import Link from "next/link";
import { getImageUrl, getPlaceholderImage, handleImageError } from "@/utils/imageUtils";
import { apiService } from "@/services/api";
import type { ShippingAddress } from "@/lib/server-api";
import type { CartItem } from "@/contexts/CartContext";
import styles from "./CartContent.module.scss";

interface CartContentProps {
  addresses: ShippingAddress[];
  defaultAddressId?: string;
  beginCheckout: (payload: any) => Promise<any>;
}

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

export default function CartContent({
  addresses,
  defaultAddressId,
  beginCheckout,
}: CartContentProps) {
  const { items, updateQuantity, removeItem, clearCart } = useCart();
  const [conflictedReservations, setConflictedReservations] = useState<string[]>([]);
  const [showConflictBanner, setShowConflictBanner] = useState(false);

  // Check for reservation conflicts when component mounts or items change
  useEffect(() => {
    const checkReservationConflicts = async () => {
      const reservationItems = items.filter(item => item.isReservation && item.reservationDate && item.reservationTime);
      
      if (reservationItems.length === 0) {
        setConflictedReservations([]);
        setShowConflictBanner(false);
        return;
      }

      const conflicts: string[] = [];

      for (const item of reservationItems) {
        try {
          const response = await apiService.checkTimeSlotAvailability(
            item.productId,
            item.reservationDate!,
            item.reservationTime!
          );

          if (response.success && response.data && !response.data.available) {
            conflicts.push(item.id);
          }
        } catch (error) {
          console.error(`Failed to check availability for item ${item.id}:`, error);
        }
      }

      if (conflicts.length > 0) {
        setConflictedReservations(conflicts);
        setShowConflictBanner(true);
        
        // Auto-remove conflicted items immediately
        conflicts.forEach(itemId => {
          removeItem(itemId);
        });
      } else {
        setConflictedReservations([]);
        setShowConflictBanner(false);
      }
    };

    checkReservationConflicts();
  }, [items, removeItem]);

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

  const handleUpdateQuantity = useCallback((id: string, quantity: number) => {
    updateQuantity(id, quantity);
  }, [updateQuantity]);

  const handleRemoveItem = useCallback((id: string) => {
    removeItem(id);
  }, [removeItem]);

  const handleDismissBanner = useCallback(() => {
    setShowConflictBanner(false);
  }, []);

  const handleClearCart = useCallback(() => {
    clearCart();
  }, [clearCart]);

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
                <CartItemCard
                  key={item.id}
                  item={item}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemoveItem={handleRemoveItem}
                />
              ))}
            </div>

            <div>
              <div className={styles.summaryCard}>
                <section>
                  <h2 className={styles.summaryTitle}>
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
                  className={styles.checkoutButton}
                >
                  Proceed to Checkout
                </Link>

                <button
                  onClick={handleClearCart}
                  disabled={items.length === 0}
                  className={styles.clearCartButton}
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
