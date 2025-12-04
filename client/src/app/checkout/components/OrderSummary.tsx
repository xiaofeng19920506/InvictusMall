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

interface PricingBreakdown {
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  shippingAmount: number;
  total: number;
}

export default function OrderSummary({
  items,
  subtotal,
  itemCount,
  shippingAddress,
}: OrderSummaryProps) {
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null);
  const [isCalculatingPricing, setIsCalculatingPricing] = useState(false);

  // Create a stable items key for dependency tracking
  const itemsKey = useMemo(() => {
    return items.map((i) => `${i.id}-${i.quantity}-${i.price}`).join(',');
  }, [items]);

  // Extract address properties for dependency tracking
  const addressId = (shippingAddress as any)?.id;
  const addressZipCode = shippingAddress?.zipCode;
  const addressStateProvince = shippingAddress?.stateProvince;
  const addressCountry = shippingAddress?.country || 'US';

  // Create a stable address key that changes when any address field changes
  const addressKey = useMemo(() => {
    if (!shippingAddress) return null;
    // Create a unique key from all address fields that affect tax calculation
    return JSON.stringify({
      id: addressId || null,
      zipCode: addressZipCode || '',
      stateProvince: addressStateProvince || '',
      country: addressCountry || 'US',
    });
  }, [addressId, addressZipCode, addressStateProvince, addressCountry]);

  // Calculate complete pricing from backend when address or items change
  useEffect(() => {
    const calculatePricingFromBackend = async () => {
      if (!shippingAddress || !items || items.length === 0 || subtotal <= 0) {
        setPricing(null);
        return;
      }

      // Use the extracted address properties
      console.log('OrderSummary: Calculating pricing for address:', {
        addressId: addressId,
        zipCode: addressZipCode,
        stateProvince: addressStateProvince,
        country: addressCountry,
        addressKey,
      });

      if (!addressZipCode || addressZipCode.trim() === '') {
        setPricing(null);
        return;
      }

      setIsCalculatingPricing(true);
      try {
        const result = await apiService.calculatePricing({
          items: items.map((item) => ({
            price: item.price,
            quantity: item.quantity,
          })),
          shippingAddress: {
            zipCode: addressZipCode.trim(),
            stateProvince: addressStateProvince?.trim(),
            country: addressCountry?.trim() || 'US',
          },
        });

        if (result.success && result.data) {
          console.log('OrderSummary: Pricing calculated:', result.data);
          setPricing({
            subtotal: result.data.subtotal,
            taxAmount: result.data.taxAmount,
            taxRate: result.data.taxRate,
            shippingAmount: result.data.shippingAmount,
            total: result.data.total,
          });
        } else {
          console.warn('OrderSummary: Pricing calculation failed:', result);
          setPricing(null);
        }
      } catch (error) {
        console.error('Failed to calculate pricing:', error);
        setPricing(null);
      } finally {
        setIsCalculatingPricing(false);
      }
    };

    calculatePricingFromBackend();
  }, [
    itemsKey,
    addressKey, // This will change when any address field changes
    addressId, // Explicitly include address ID to catch address selection changes
    addressZipCode,
    addressStateProvince,
    addressCountry,
    subtotal,
  ]);

  // Use backend pricing if available, otherwise fallback to local calculations
  const displaySubtotal = pricing?.subtotal ?? subtotal;
  const estimatedTax = pricing?.taxAmount ?? 0;
  const estimatedShipping = pricing?.shippingAmount ?? (subtotal >= 50 ? 0 : 5.99);
  const total = pricing?.total ?? (subtotal + estimatedTax + estimatedShipping);

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
          <span className={styles.priceValue}>${displaySubtotal.toFixed(2)}</span>
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
              {isCalculatingPricing && (
                <span className={styles.calculatingTax}>(calculating...)</span>
              )}
            </span>
            <span className={styles.priceValue}>
              {isCalculatingPricing ? '...' : `$${estimatedTax.toFixed(2)}`}
            </span>
          </div>
        ) : (
          <div className={styles.priceRow}>
            <span className={styles.estimatedTaxPlaceholder}>Estimated tax</span>
            <span className={styles.estimatedTaxPlaceholder}>Enter address</span>
          </div>
        )}
        {displaySubtotal < 50 && (
          <p className={styles.freeShippingNotice}>
            Add ${(50 - displaySubtotal).toFixed(2)} more for FREE shipping
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

