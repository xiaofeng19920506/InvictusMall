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
import styles from "./PaymentMethodStep.module.scss";

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
  onError?: (error: string) => void;
}

function PaymentForm({
  items,
  shippingAddress,
  onContinue,
  onCreatePaymentIntent,
  onError,
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
        const errorMessage = err.message || "Failed to initialize payment";
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
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
        const errorMessage = confirmError.message || "Payment failed";
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
        setIsProcessing(false);
        return;
      }

      // Payment authorization check (Amazon-style: authorize at checkout, capture when delivered)
      // With manual capture, status will be "requires_capture" after authorization (not "succeeded")
      if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "requires_capture")) {
        // Payment authorized (or already captured), continue to review step
        // Order will be finalized in ReviewOrderStep when user clicks "Place your order"
        // Actual charge will happen when order is delivered
        onContinue(paymentIntentId, clientSecret);
      } else {
        // Payment is still processing or requires action (3D Secure, etc.)
        let errorMessage = "";
        if (paymentIntent?.status === "requires_action") {
          errorMessage = "Additional authentication required. Please complete the verification.";
        } else {
          errorMessage = "Payment was not authorized. Please try again.";
        }
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
        setIsProcessing(false);
      }
    } catch (err: any) {
      const errorMessage = err.message || "An error occurred during payment";
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
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
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.paymentMethodCard}>
        <div className={styles.paymentMethodHeader}>
          <input
            type="radio"
            name="payment-method"
            checked
            readOnly
            className={styles.paymentRadio}
          />
          <div className={styles.paymentMethodInfo}>
            <p className={styles.paymentMethodTitle}>Credit or Debit Card</p>
            <p className={styles.paymentMethodSubtitle}>
              Secure payment powered by Stripe
            </p>
          </div>
        </div>

        <div className={styles.cardDetailsContainer}>
          <label className={styles.cardDetailsLabel}>
            Card Details
          </label>
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      <div className={styles.securityNotice}>
        <p className={styles.securityText}>
          <strong>Secure Payment:</strong> All payments are processed securely through Stripe.
          We do not store your payment information.
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className={styles.buttonGroup}>
        <button
          type="button"
          onClick={() => window.history.back()}
          className={styles.backButton}
          disabled={isProcessing}
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!stripe || !clientSecret || isProcessing}
          className={styles.continueButton}
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
  onError,
}: PaymentMethodStepProps) {
  const elementsOptions: StripeElementsOptions = {
    appearance: {
      theme: "stripe",
    },
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>
        Payment method
      </h2>

      <Elements stripe={stripePromise} options={elementsOptions}>
        <PaymentForm
          items={items}
          shippingAddress={shippingAddress}
          onContinue={onContinue}
          onCreatePaymentIntent={onCreatePaymentIntent}
          onError={onError}
        />
      </Elements>
    </div>
  );
}
