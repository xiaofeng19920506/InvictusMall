"use client";

import { useMemo } from "react";
import { getImageUrl } from "@/utils/imageUtils";
import type { CartItem } from "@/contexts/CartContext";

interface OrderSummaryProps {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

export default function OrderSummary({
  items,
  subtotal,
  itemCount,
}: OrderSummaryProps) {
  const estimatedTax = useMemo(() => subtotal * 0.08, [subtotal]); // 8% tax estimate
  const estimatedShipping = useMemo(() => {
    // Free shipping over $50, otherwise $5.99
    return subtotal >= 50 ? 0 : 5.99;
  }, [subtotal]);
  const total = useMemo(
    () => subtotal + estimatedTax + estimatedShipping,
    [subtotal, estimatedTax, estimatedShipping]
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Order Summary
      </h2>

      {/* Items List */}
      <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3 text-sm">
            {item.productImage ? (
              <img
                src={getImageUrl(item.productImage) || "/placeholder/product.png"}
                alt={item.productName}
                className="w-16 h-16 object-cover rounded flex-shrink-0"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = "/placeholder/product.png";
                }}
              />
            ) : (
              <div className="w-16 h-16 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center">
                <span className="text-gray-400 text-xs">No Image</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{item.productName}</p>
              <p className="text-gray-600 text-xs">Qty: {item.quantity}</p>
              <p className="text-gray-900 font-medium mt-1">
                ${(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Price Breakdown */}
      <div className="space-y-2 text-sm border-t border-gray-200 pt-4">
        <div className="flex justify-between">
          <span className="text-gray-600">
            Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
          </span>
          <span className="font-medium">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Shipping & handling</span>
          <span className="font-medium">
            {estimatedShipping === 0 ? (
              <span className="text-green-600">FREE</span>
            ) : (
              `$${estimatedShipping.toFixed(2)}`
            )}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Estimated tax</span>
          <span className="font-medium">${estimatedTax.toFixed(2)}</span>
        </div>
        {subtotal < 50 && (
          <p className="text-xs text-green-600 mt-1">
            Add ${(50 - subtotal).toFixed(2)} more for FREE shipping
          </p>
        )}
      </div>

      {/* Total */}
      <div className="mt-4 pt-4 border-t-2 border-gray-300">
        <div className="flex justify-between text-lg font-semibold text-gray-900">
          <span>Order Total</span>
          <span className="text-orange-600">${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Security Badge */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <svg
            className="w-4 h-4 text-green-600"
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

