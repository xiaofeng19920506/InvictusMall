"use client";

import { useState, useEffect, useRef } from "react";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import type { CartItem } from "@/contexts/CartContext";
import type { ShippingAddress } from "@/lib/server-api";
import type { CheckoutShippingAddressInput } from "../../cart/types";

// Initialize Stripe (use publishable key from environment or a placeholder)
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder"
);

interface PaymentMethodStepProps {
  items: CartItem[];
  shippingAddress: ShippingAddress | CheckoutShippingAddressInput | null;
  onContinue: (paymentIntentId: string, clientSecret: string) => void;
  onBack: () => void;
  onCreatePaymentIntent: (
    items: CartItem[],
    shippingAddress: ShippingAddress | CheckoutShippingAddressInput | null
  ) => Promise<{ clientSecret: string; paymentIntentId: string; orderIds: string[] }>;
}

function PaymentForm({
  items,
  shippingAddress,
  onContinue,
  onCreatePaymentIntent,
}: Omit<PaymentMethodStepProps, "onBack">) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const hasCreatedIntentRef = useRef(false);

  // Create payment intent when component mounts (only once, even in Strict Mode)
  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (hasCreatedIntentRef.current) {
      return;
    }

    const createIntent = async () => {
      if (!shippingAddress) {
        setError("Shipping address is required");
        return;
      }

      // Mark as creating to prevent duplicate calls
      hasCreatedIntentRef.current = true;

      try {
        setIsProcessing(true);
        setError(null);
        const result = await onCreatePaymentIntent(items, shippingAddress);
        setClientSecret(result.clientSecret);
        setPaymentIntentId(result.paymentIntentId);
      } catch (err: any) {
        setError(err.message || "Failed to initialize payment");
        // Reset ref on error so user can retry
        hasCreatedIntentRef.current = false;
      } finally {
        setIsProcessing(false);
      }
    };

    createIntent();
  }, []); // Only run once on mount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !clientSecret || !paymentIntentId) {
      setError("Payment system is not ready. Please wait...");
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("Card element not found");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Amazon-style checkout: Confirm payment immediately when user submits card
      // This matches Amazon's flow where payment is processed before order review
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (confirmError) {
        setError(confirmError.message || "Payment failed");
        setIsProcessing(false);
        return;
      }

      // Payment must be succeeded to proceed (Amazon-style: payment done before review)
      if (paymentIntent && paymentIntent.status === "succeeded") {
        // Payment succeeded, continue to review step
        // Order will be finalized in ReviewOrderStep when user clicks "Place your order"
        onContinue(paymentIntentId, clientSecret);
      } else {
        // Payment is still processing or requires action (3D Secure, etc.)
        if (paymentIntent?.status === "requires_action") {
          setError("Additional authentication required. Please complete the verification.");
        } else {
          setError("Payment was not completed. Please try again.");
        }
        setIsProcessing(false);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during payment");
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: "16px",
        color: "#424770",
        "::placeholder": {
          color: "#aab7c4",
        },
      },
      invalid: {
        color: "#9e2146",
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border-2 border-orange-500 rounded-lg bg-orange-50">
        <div className="flex items-center gap-3 mb-4">
          <input
            type="radio"
            name="payment-method"
            checked
            readOnly
            className="h-4 w-4 text-orange-500 focus:ring-orange-500"
          />
          <div className="flex-1">
            <p className="font-medium text-gray-900">Credit or Debit Card</p>
            <p className="text-sm text-gray-600 mt-1">
              Secure payment powered by Stripe
            </p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Details
          </label>
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
        <p className="text-sm text-gray-600">
          <strong>Secure Payment:</strong> All payments are processed securely through Stripe.
          We do not store your payment information.
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors font-medium"
          disabled={isProcessing}
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!stripe || !clientSecret || isProcessing}
          className="bg-orange-500 text-white px-6 py-2 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition-colors font-medium"
        >
          {isProcessing ? "Processing..." : "Continue to review"}
        </button>
      </div>
    </form>
  );
}

export default function PaymentMethodStep({
  items,
  shippingAddress,
  onContinue,
  onBack,
  onCreatePaymentIntent,
}: PaymentMethodStepProps) {
  const elementsOptions: StripeElementsOptions = {
    appearance: {
      theme: "stripe",
    },
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        Payment method
      </h2>

      <Elements stripe={stripePromise} options={elementsOptions}>
        <PaymentForm
          items={items}
          shippingAddress={shippingAddress}
          onContinue={onContinue}
          onCreatePaymentIntent={onCreatePaymentIntent}
        />
      </Elements>
    </div>
  );
}
