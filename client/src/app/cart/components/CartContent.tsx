"use client";

import { useMemo } from "react";
import { useCart } from "@/contexts/CartContext";
import Header from "@/components/common/Header";
import Link from "next/link";
import { getImageUrl, getPlaceholderImage, handleImageError } from "@/utils/imageUtils";
import type { ShippingAddress } from "@/lib/server-api";
import styles from "./CartContent.module.scss";

interface CartContentProps {
  addresses: ShippingAddress[];
  defaultAddressId?: string;
  beginCheckout: (payload: any) => Promise<any>;
}

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
                <div key={item.id} className={styles.cartItem}>
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
                          {item.isReservation && item.reservationDate && item.reservationTime && (
                            <div className={styles.reservationInfo}>
                              <p className={styles.reservationDate}>
                                📅 {new Date(item.reservationDate).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                              <p className={styles.reservationTime}>
                                🕐 {new Date(`2000-01-01T${item.reservationTime}`).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
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
                          onClick={() => removeItem(item.id)}
                          className={styles.removeButton}
                        >
                          ✕
                        </button>
                      </div>
                      <div className={styles.itemFooter}>
                        {!item.isReservation && (
                          <div className={styles.quantityControls}>
                            <button
                              onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                              }
                              className={styles.quantityButton}
                            >
                              −
                            </button>
                            <span className={styles.quantityValue}>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(item.id, item.quantity + 1)
                              }
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
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
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
                  onClick={clearCart}
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
