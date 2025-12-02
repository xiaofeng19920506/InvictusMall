"use client";

import { useState, useEffect, useMemo } from "react";
import { useCart, type CartItem } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Header from "@/components/common/Header";
import Link from "next/link";
import type { ShippingAddress } from "@/lib/server-api";
import type {
  CheckoutPayload,
  CheckoutSessionResult,
  CheckoutShippingAddressInput,
} from "../../cart/types";
import { apiService } from "@/services/api";
import DeliveryAddressStep from "./DeliveryAddressStep";
import PaymentMethodStep from "./PaymentMethodStep";
import ReviewOrderStep from "./ReviewOrderStep";
import OrderSummary from "./OrderSummary";
import styles from "./CheckoutContent.module.scss";

interface CheckoutContentProps {
  addresses: ShippingAddress[];
  defaultAddressId?: string;
  beginCheckout?: (payload: CheckoutPayload) => Promise<CheckoutSessionResult>;
}

type CheckoutStep = "delivery" | "payment" | "review";

const EMPTY_ADDRESS: CheckoutShippingAddressInput = {
  fullName: "",
  phoneNumber: "",
  streetAddress: "",
  aptNumber: "",
  city: "",
  stateProvince: "",
  zipCode: "",
  country: "",
};

export default function CheckoutContent({
  addresses,
  defaultAddressId,
  beginCheckout,
}: CheckoutContentProps) {
  const { items, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/checkout");
    }
  }, [isAuthenticated, router]);

  const [currentStep, setCurrentStep] = useState<CheckoutStep>("delivery");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Delivery address state
  const [useExistingAddress, setUseExistingAddress] = useState(
    isAuthenticated && addresses.length > 0
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    defaultAddressId || addresses[0]?.id || ""
  );
  const [newAddress, setNewAddress] =
    useState<CheckoutShippingAddressInput>(EMPTY_ADDRESS);
  const [saveNewAddress, setSaveNewAddress] = useState(true);

  // Redirect to cart if empty
  useEffect(() => {
    if (items.length === 0) {
      router.push("/cart");
    }
  }, [items.length, router]);

  useEffect(() => {
    if (isAuthenticated && addresses.length > 0) {
      setUseExistingAddress(true);
      setSelectedAddressId(defaultAddressId || addresses[0]?.id || "");
    } else {
      setUseExistingAddress(false);
      setSelectedAddressId("");
    }
  }, [addresses, defaultAddressId, isAuthenticated]);

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

  // Get current shipping address for tax calculation
  const currentShippingAddress = useMemo(() => {
    if (useExistingAddress && isAuthenticated && addresses.length > 0 && selectedAddressId) {
      return addresses.find((a) => a.id === selectedAddressId) || null;
    }
    // Check if new address has required fields filled
    if (
      newAddress.stateProvince.trim() &&
      newAddress.city.trim() &&
      newAddress.zipCode.trim()
    ) {
      return newAddress;
    }
    return null;
  }, [useExistingAddress, isAuthenticated, addresses, selectedAddressId, newAddress]);

  const validateDeliveryStep = (): string | null => {
    // User must be authenticated to checkout
    if (!isAuthenticated) {
      return "Please log in to continue with checkout.";
    }

    // Validate shipping address
    if (useExistingAddress && addresses.length > 0) {
      if (!selectedAddressId) {
        return "Please select a shipping address.";
      }
      return null;
    }

    if (
      !newAddress.fullName.trim() ||
      !newAddress.phoneNumber.trim() ||
      !newAddress.streetAddress.trim() ||
      !newAddress.city.trim() ||
      !newAddress.stateProvince.trim() ||
      !newAddress.zipCode.trim() ||
      !newAddress.country.trim()
    ) {
      return "Please complete all required shipping address fields.";
    }

    return null;
  };

  const handleContinueToPayment = () => {
    setStatusError(null);
    const error = validateDeliveryStep();
    if (error) {
      setStatusError(error);
      return;
    }
    setCurrentStep("payment");
  };

  const handleContinueToReview = (paymentIntentId: string, clientSecret: string) => {
    setStatusError(null);
    setPaymentIntentId(paymentIntentId);
    setClientSecret(clientSecret);
    setCurrentStep("review");
  };

  const handleCreatePaymentIntent = async (
    itemsToProcess: CartItem[],
    shippingAddress: ShippingAddress | CheckoutShippingAddressInput | null
  ) => {
    if (!shippingAddress) {
      throw new Error("Shipping address is required");
    }

    const payload: CheckoutPayload = {
      items: itemsToProcess.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        quantity: item.quantity,
        price: item.price,
        storeId: item.storeId,
        storeName: item.storeName,
        // Include reservation fields if present
        reservationDate: item.reservationDate,
        reservationTime: item.reservationTime,
        reservationNotes: item.reservationNotes,
        isReservation: item.isReservation,
      })),
      shippingAddressId: useExistingAddress && selectedAddressId ? selectedAddressId : undefined,
      newShippingAddress: !useExistingAddress && shippingAddress && 'fullName' in shippingAddress
        ? {
            fullName: shippingAddress.fullName,
            phoneNumber: shippingAddress.phoneNumber,
            streetAddress: shippingAddress.streetAddress,
            aptNumber: shippingAddress.aptNumber,
            city: shippingAddress.city,
            stateProvince: shippingAddress.stateProvince,
            zipCode: shippingAddress.zipCode,
            country: shippingAddress.country,
          }
        : undefined,
      saveNewAddress: !useExistingAddress && saveNewAddress,
    };

    const result = await apiService.createPaymentIntent(payload);
    if (!result.success || !result.data) {
      throw new Error(result.message || "Failed to create payment intent");
    }

    return result.data;
  };

  const handleBackToDelivery = () => {
    setCurrentStep("delivery");
  };

  const handleBackToPayment = () => {
    setCurrentStep("payment");
  };

  const handlePlaceOrder = async () => {
    setStatusError(null);

    if (!paymentIntentId) {
      setStatusError("Payment intent is missing. Please go back to payment step.");
      return;
    }

    try {
      setIsProcessing(true);
      
      // Payment was already confirmed in PaymentMethodStep
      // Now we just need to finalize the order on backend
      // This matches Amazon's flow: payment is processed before review, then order is finalized
      const result = await apiService.confirmPayment(paymentIntentId);

      if (result.success) {
        clearCart();
        // Redirect to success page
        router.push(`/checkout/success?payment_intent=${paymentIntentId}`);
        return;
      }

      setStatusError(
        result.message || "Unable to complete order. Please try again."
      );
    } catch (error) {
      console.error("Failed to complete order:", error);
      setStatusError(
        error instanceof Error
          ? error.message
          : "Unexpected error completing order. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <>
        <Header />
        <div className={styles.emptyCartContainer}>
          <div className={styles.emptyCartContent}>
            <h2 className={styles.emptyCartTitle}>
              Your cart is empty
            </h2>
            <Link
              href="/"
              className={styles.continueShoppingButton}
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </>
    );
  }

  const getStepClass = (step: string) => {
    if (currentStep === step) return styles.active;
    if (
      (step === "delivery" && (currentStep === "payment" || currentStep === "review")) ||
      (step === "payment" && currentStep === "review")
    ) {
      return styles.completed;
    }
    return styles.inactive;
  };

  const getCircleClass = (step: string) => {
    if (currentStep === step) return styles.active;
    if (
      (step === "delivery" && (currentStep === "payment" || currentStep === "review")) ||
      (step === "payment" && currentStep === "review")
    ) {
      return styles.completed;
    }
    return styles.inactive;
  };

  const getConnectorClass = (step: string) => {
    if (
      (step === "delivery" && (currentStep === "payment" || currentStep === "review")) ||
      (step === "payment" && currentStep === "review")
    ) {
      return styles.completed;
    }
    return styles.inactive;
  };

  return (
    <>
      <Header />
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          {/* Progress Indicator */}
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div className={`${styles.stepGroup} ${getStepClass("delivery")}`}>
                <div className={`${styles.stepCircle} ${getCircleClass("delivery")}`}>
                  {currentStep === "payment" || currentStep === "review" ? "✓" : "1"}
                </div>
                <span className={styles.stepLabel}>Delivery</span>
              </div>
              <div className={`${styles.stepConnector} ${getConnectorClass("delivery")}`} />
              <div className={`${styles.stepGroup} ${getStepClass("payment")}`}>
                <div className={`${styles.stepCircle} ${getCircleClass("payment")}`}>
                  {currentStep === "review" ? "✓" : "2"}
                </div>
                <span className={styles.stepLabel}>Payment</span>
              </div>
              <div className={`${styles.stepConnector} ${getConnectorClass("payment")}`} />
              <div className={`${styles.stepGroup} ${getStepClass("review")}`}>
                <div className={`${styles.stepCircle} ${getCircleClass("review")}`}>
                  3
                </div>
                <span className={styles.stepLabel}>Review</span>
              </div>
            </div>
          </div>

          <div className={styles.contentGrid}>
            {/* Main Checkout Content */}
            <div className={styles.mainContent}>
              <div className={styles.stepCard}>
                {statusError && (
                  <div className={styles.errorBanner}>
                    <p className={styles.errorMessage}>{statusError}</p>
                  </div>
                )}

                {currentStep === "delivery" && (
                  <DeliveryAddressStep
                    isAuthenticated={isAuthenticated}
                    addresses={addresses}
                    useExistingAddress={useExistingAddress}
                    setUseExistingAddress={setUseExistingAddress}
                    selectedAddressId={selectedAddressId}
                    setSelectedAddressId={setSelectedAddressId}
                    newAddress={newAddress}
                    setNewAddress={setNewAddress}
                    saveNewAddress={saveNewAddress}
                    setSaveNewAddress={setSaveNewAddress}
                    onContinue={handleContinueToPayment}
                  />
                )}

                {currentStep === "payment" && (
                  <PaymentMethodStep
                    items={items}
                    shippingAddress={currentShippingAddress}
                    onContinue={handleContinueToReview}
                    onBack={handleBackToDelivery}
                    onCreatePaymentIntent={handleCreatePaymentIntent}
                  />
                )}

                {currentStep === "review" && (
                  <ReviewOrderStep
                    items={items}
                    shippingAddress={
                      useExistingAddress && addresses.length > 0
                        ? addresses.find((a) => a.id === selectedAddressId)
                        : {
                            fullName: newAddress.fullName,
                            phoneNumber: newAddress.phoneNumber,
                            streetAddress: newAddress.streetAddress,
                            aptNumber: newAddress.aptNumber,
                            city: newAddress.city,
                            stateProvince: newAddress.stateProvince,
                            zipCode: newAddress.zipCode,
                            country: newAddress.country,
                          }
                    }
                    isAuthenticated={isAuthenticated}
                    onPlaceOrder={handlePlaceOrder}
                    onBack={handleBackToPayment}
                    onBackToDelivery={handleBackToDelivery}
                    isProcessing={isProcessing}
                  />
                )}
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className={styles.sidebar}>
              <OrderSummary
                items={items}
                subtotal={subtotal}
                itemCount={itemCount}
                shippingAddress={currentShippingAddress}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

