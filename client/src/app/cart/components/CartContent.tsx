"use client";

import { useMemo } from "react";
import { useCart } from "@/contexts/CartContext";
import Header from "@/components/common/Header";
import Link from "next/link";
import { getImageUrl } from "@/utils/imageUtils";
import type { ShippingAddress } from "@/lib/server-api";

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Shopping Cart</h1>

        {items.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Your cart is empty
            </h3>
            <p className="text-gray-600 mb-6">
              Start shopping to add items to your cart!
            </p>
            <Link
              href="/"
              className="inline-block bg-orange-500 text-white px-6 py-2 rounded-md hover:bg-orange-600 transition-colors cursor-pointer"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
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
              ))}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-4 space-y-6">
                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">
                    Order Summary
                  </h2>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Subtotal ({itemCount} items)
                      </span>
                      <span className="font-medium">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shipping</span>
                      <span className="font-medium">Calculated at checkout</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax</span>
                      <span className="font-medium">Calculated at checkout</span>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <div className="flex justify-between text-lg font-semibold text-gray-900">
                      <span>Total</span>
                      <span className="text-orange-500">
                        ${subtotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </section>

                <Link
                  href="/checkout"
                  className="w-full bg-orange-500 text-white py-3 px-4 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors cursor-pointer text-center font-medium block"
                >
                  Proceed to Checkout
                </Link>

                <button
                  onClick={clearCart}
                  disabled={items.length === 0}
                  className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  Clear Cart
                </button>

                <Link
                  href="/"
                  className="block text-center text-orange-500 hover:text-orange-600 cursor-pointer"
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
