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
<<<<<<< HEAD
=======
import styles from "./CheckoutContent.module.scss";
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009

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
<<<<<<< HEAD
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
=======
        <div className={styles.emptyCartContainer}>
          <div className={styles.emptyCartContent}>
            <h2 className={styles.emptyCartTitle}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
              Your cart is empty
            </h2>
            <Link
              href="/"
<<<<<<< HEAD
              className="inline-block bg-orange-500 text-white px-6 py-2 rounded-md hover:bg-orange-600 transition-colors"
=======
              className={styles.continueShoppingButton}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </>
    );
  }

<<<<<<< HEAD
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between max-w-3xl">
              <div className="flex items-center flex-1">
                <div className={`flex items-center ${currentStep === "delivery" ? "text-orange-600" : currentStep === "payment" || currentStep === "review" ? "text-green-600" : "text-gray-400"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${currentStep === "delivery" ? "bg-orange-600 text-white" : currentStep === "payment" || currentStep === "review" ? "bg-green-600 text-white" : "bg-gray-300 text-gray-600"}`}>
                    {currentStep === "payment" || currentStep === "review" ? "✓" : "1"}
                  </div>
                  <span className="ml-2 font-medium">Delivery</span>
                </div>
                <div className={`flex-1 h-1 mx-4 ${currentStep === "payment" || currentStep === "review" ? "bg-green-600" : "bg-gray-300"}`} />
                <div className={`flex items-center ${currentStep === "payment" ? "text-orange-600" : currentStep === "review" ? "text-green-600" : "text-gray-400"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${currentStep === "payment" ? "bg-orange-600 text-white" : currentStep === "review" ? "bg-green-600 text-white" : "bg-gray-300 text-gray-600"}`}>
                    {currentStep === "review" ? "✓" : "2"}
                  </div>
                  <span className="ml-2 font-medium">Payment</span>
                </div>
                <div className={`flex-1 h-1 mx-4 ${currentStep === "review" ? "bg-green-600" : "bg-gray-300"}`} />
                <div className={`flex items-center ${currentStep === "review" ? "text-orange-600" : "text-gray-400"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${currentStep === "review" ? "bg-orange-600 text-white" : "bg-gray-300 text-gray-600"}`}>
                    3
                  </div>
                  <span className="ml-2 font-medium">Review</span>
                </div>
=======
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
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
              </div>
            </div>
          </div>

<<<<<<< HEAD
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Checkout Content */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md">
                {statusError && (
                  <div className="border-b border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-700">{statusError}</p>
=======
          <div className={styles.contentGrid}>
            {/* Main Checkout Content */}
            <div className={styles.mainContent}>
              <div className={styles.stepCard}>
                {statusError && (
                  <div className={styles.errorBanner}>
                    <p className={styles.errorMessage}>{statusError}</p>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
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
<<<<<<< HEAD
=======
                    onError={(error) => setStatusError(error)}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
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
<<<<<<< HEAD
            <div className="lg:col-span-1">
=======
            <div className={styles.sidebar}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
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

