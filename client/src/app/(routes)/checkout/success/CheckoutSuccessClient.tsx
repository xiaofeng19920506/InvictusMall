'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/common/Header';
import { useCart } from '@/contexts/CartContext';
import styles from './CheckoutSuccessClient.module.scss';

interface CheckoutSuccessClientProps {
  completionResult: {
    success: boolean;
    message?: string;
  };
  orderIds: string[];
}

const REDIRECT_SECONDS = 5;

export default function CheckoutSuccessClient({
  completionResult,
  orderIds
}: CheckoutSuccessClientProps) {
  const { clearCart } = useCart();

  // Clear cart on successful checkout
  useEffect(() => {
    if (completionResult.success) {
      clearCart();
    }
  }, [completionResult.success, clearCart]);

  return (
    <>
      <Header />
      <div className={styles.pageContainer}>
        <div className={styles.card}>
          <div className={styles.iconContainer}>
            <div className={styles.icon}>
              ✓
            </div>
          </div>
          <h1 className={styles.title}>
            {completionResult.success
              ? "Thank you for your purchase!"
              : "We're processing your order"}
          </h1>
          <p className={styles.message}>
            {completionResult.success
              ? "Your order has been placed successfully. We're preparing it for you."
              : completionResult.message ||
                "We're finalizing your order details. Please hold on for a moment."}
          </p>

          {completionResult.success ? (
            <div className={styles.successContent}>
              <div className={styles.orderIdContainer}>
                <p className={styles.orderIdLabel}>
                  {orderIds.length > 1 ? "Order IDs" : "Order ID"}
                </p>
                {orderIds.length > 1 ? (
                  <ul className={styles.orderIdList}>
                    {orderIds.map((id) => (
                      <li key={id} className={styles.orderIdItem}>
                        {id}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.orderIdSingle}>
                    {orderIds[0] ?? "Processing..."}
                  </p>
                )}
              </div>
              <p className={styles.redirectText}>
                You will be redirected to the home page in{" "}
                <span className={styles.redirectCount}>{REDIRECT_SECONDS}</span>{" "}
                seconds.
              </p>
            </div>
          ) : (
            <div className={styles.warningContainer}>
              <p className={styles.warningTitle}>What to do next?</p>
              <p className={styles.warningMessage}>
                {completionResult.message
                  ? "Please refresh this page or return to your orders to verify the status."
                  : "Please refresh this page shortly. If the issue persists, contact support with your payment confirmation email."}
              </p>
            </div>
          )}

          <div className={styles.buttonGroup}>
            <Link
              href="/profile?tab=orders&orderStatus=all"
              className={styles.viewOrdersButton}
            >
              View My Orders
            </Link>
            <Link
              href="/"
              className={styles.homeButton}
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
      {completionResult.success ? (
        <meta
          httpEquiv="refresh"
          content={`${REDIRECT_SECONDS}; url=/`}
        />
      ) : null}
    </>
  );
}
