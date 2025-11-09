'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/common/Header';
import { useCart } from '@/contexts/CartContext';

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-lg max-w-xl w-full p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-3xl">
              ✓
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {completionResult.success
              ? "Thank you for your purchase!"
              : "We’re processing your order"}
          </h1>
          <p className="text-gray-600">
            {completionResult.success
              ? "Your order has been placed successfully. We’re preparing it for you."
              : completionResult.message ||
                "We’re finalizing your order details. Please hold on for a moment."}
          </p>

          {completionResult.success ? (
            <div className="space-y-4">
              <div className="bg-gray-100 rounded-lg p-4">
                <p className="text-sm text-gray-500 uppercase tracking-wide">
                  {orderIds.length > 1 ? "Order IDs" : "Order ID"}
                </p>
                {orderIds.length > 1 ? (
                  <ul className="mt-2 space-y-1 text-left text-gray-900">
                    {orderIds.map((id) => (
                      <li key={id} className="break-all font-semibold">
                        {id}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-lg font-semibold text-gray-900 break-words">
                    {orderIds[0] ?? "Processing..."}
                  </p>
                )}
              </div>
              <p className="text-sm text-gray-500">
                You will be redirected to the home page in{" "}
                <span className="font-semibold">{REDIRECT_SECONDS}</span>{" "}
                seconds.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              <p className="font-medium">What to do next?</p>
              <p className="mt-1">
                {completionResult.message
                  ? "Please refresh this page or return to your orders to verify the status."
                  : "Please refresh this page shortly. If the issue persists, contact support with your payment confirmation email."}
              </p>
            </div>
          )}

          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-md transition-colors cursor-pointer"
          >
            Return to Home
          </Link>
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
