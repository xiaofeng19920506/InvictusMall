"use client";

import { useMemo, useEffect, useState } from "react";
import { getImageUrl, getPlaceholderImage, handleImageError } from "@/utils/imageUtils";
import { apiService } from "@/services/api";
import type { CartItem } from "@/contexts/CartContext";
import type { ShippingAddress } from "@/lib/server-api";
import type { CheckoutShippingAddressInput } from "../../cart/types";
import styles from "./OrderSummary.module.scss";

interface OrderSummaryProps {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  shippingAddress?: ShippingAddress | CheckoutShippingAddressInput | null;
}

export default function OrderSummary({
  items,
  subtotal,
  itemCount,
  shippingAddress,
}: OrderSummaryProps) {
  const [taxData, setTaxData] = useState<{
    taxAmount: number;
    taxRate: number;
  } | null>(null);
  const [isCalculatingTax, setIsCalculatingTax] = useState(false);

  // Calculate tax when address changes
  useEffect(() => {
    const calculateTaxFromBackend = async () => {
      if (!shippingAddress || !subtotal || subtotal <= 0) {
        setTaxData(null);
        return;
      }

      // Both ShippingAddress and CheckoutShippingAddressInput have these fields
      const zipCode = (shippingAddress as any).zipCode;
      const stateProvince = (shippingAddress as any).stateProvince;
      const country = (shippingAddress as any).country || 'US';

      if (!zipCode || zipCode.trim() === '') {
        setTaxData(null);
        return;
      }

      setIsCalculatingTax(true);
      try {
        const result = await apiService.calculateTax({
          subtotal,
          zipCode: zipCode.trim(),
          stateProvince: stateProvince?.trim(),
          country: country?.trim() || 'US',
        });

        if (result.success && result.data) {
          setTaxData({
            taxAmount: result.data.taxAmount,
            taxRate: result.data.taxRate,
          });
        } else {
          setTaxData(null);
        }
      } catch (error) {
        console.error('Failed to calculate tax:', error);
        setTaxData(null);
      } finally {
        setIsCalculatingTax(false);
      }
    };

    calculateTaxFromBackend();
  }, [subtotal, shippingAddress]);

  const estimatedTax = taxData?.taxAmount || 0;
  const estimatedShipping = useMemo(() => {
    // Free shipping over $50, otherwise $5.99
    return subtotal >= 50 ? 0 : 5.99;
  }, [subtotal]);
  const total = useMemo(
    () => subtotal + estimatedTax + estimatedShipping,
    [subtotal, estimatedTax, estimatedShipping]
  );

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>
        Order Summary
      </h2>

      {/* Items List */}
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
              <p className={styles.itemQuantity}>Qty: {item.quantity}</p>
              <p className={styles.itemPrice}>
                ${(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Price Breakdown */}
      <div className={styles.priceBreakdown}>
        <div className={styles.priceRow}>
          <span className={styles.priceLabel}>
            Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
          </span>
          <span className={styles.priceValue}>${subtotal.toFixed(2)}</span>
        </div>
        <div className={styles.priceRow}>
          <span className={styles.priceLabel}>Shipping & handling</span>
          <span className={styles.priceValue}>
            {estimatedShipping === 0 ? (
              <span className={styles.freeShipping}>FREE</span>
            ) : (
              `$${estimatedShipping.toFixed(2)}`
            )}
          </span>
        </div>
        {shippingAddress ? (
          <div className={styles.priceRow}>
            <span className={styles.priceLabel}>
              Estimated tax
              {isCalculatingTax && (
                <span className={styles.calculatingTax}>(calculating...)</span>
              )}
            </span>
            <span className={styles.priceValue}>
              {isCalculatingTax ? '...' : `$${estimatedTax.toFixed(2)}`}
            </span>
          </div>
        ) : (
          <div className={styles.priceRow}>
            <span className={styles.estimatedTaxPlaceholder}>Estimated tax</span>
            <span className={styles.estimatedTaxPlaceholder}>Enter address</span>
          </div>
        )}
        {subtotal < 50 && (
          <p className={styles.freeShippingNotice}>
            Add ${(50 - subtotal).toFixed(2)} more for FREE shipping
          </p>
        )}
      </div>

      {/* Total */}
      <div className={styles.totalSection}>
        <div className={styles.totalRow}>
          <span>Order Total</span>
          <span className={styles.totalAmount}>${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Security Badge */}
      <div className={styles.securityBadge}>
        <div className={styles.securityContent}>
          <svg
            className={styles.securityIcon}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <span>Secure checkout</span>
        </div>
      </div>
    </div>
  );
}

