"use client";

import { useState, useEffect, useMemo } from "react";
import { useCart } from "@/contexts/CartContext";
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
import { authService } from "@/services/auth";
import DeliveryAddressStep from "./DeliveryAddressStep";
import PaymentMethodStep from "./PaymentMethodStep";
import ReviewOrderStep from "./ReviewOrderStep";
import OrderSummary from "./OrderSummary";

interface CheckoutContentProps {
  addresses: ShippingAddress[];
  defaultAddressId?: string;
  beginCheckout: (payload: CheckoutPayload) => Promise<CheckoutSessionResult>;
  beginGuestCheckout?: (payload: CheckoutPayload) => Promise<CheckoutSessionResult>;
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
  beginGuestCheckout,
}: CheckoutContentProps) {
  const { items, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<CheckoutStep>("delivery");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

  // Guest checkout fields
  const [guestEmail, setGuestEmail] = useState("");
  const [guestFullName, setGuestFullName] = useState("");
  const [guestPhoneNumber, setGuestPhoneNumber] = useState("");

  // Account check state
  const [accountCheckResult, setAccountCheckResult] = useState<{
    exists: boolean;
    message?: string;
  } | null>(null);
  const [isCheckingAccount, setIsCheckingAccount] = useState(false);

  // Redirect to cart if empty
  useEffect(() => {
    if (items.length === 0) {
      router.push("/cart");
    }
  }, [items.length, router]);

  // Check for existing account when guest email or phone changes
  useEffect(() => {
    if (isAuthenticated) {
      setAccountCheckResult(null);
      return;
    }

    const checkAccount = async () => {
      if (!guestEmail.trim() && !guestPhoneNumber.trim()) {
        setAccountCheckResult(null);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const hasValidEmail = guestEmail.trim() && emailRegex.test(guestEmail.trim());
      const hasValidPhone = guestPhoneNumber.trim().length >= 10;

      if (!hasValidEmail && !hasValidPhone) {
        setAccountCheckResult(null);
        return;
      }

      setIsCheckingAccount(true);
      try {
        const result = await authService.checkAccountExists(
          hasValidEmail ? guestEmail.trim() : undefined,
          hasValidPhone ? guestPhoneNumber.trim() : undefined
        );

        if (result.success) {
          setAccountCheckResult({
            exists: result.exists,
            message: result.message,
          });
        } else {
          setAccountCheckResult(null);
        }
      } catch (error) {
        console.error("Failed to check account:", error);
        setAccountCheckResult(null);
      } finally {
        setIsCheckingAccount(false);
      }
    };

    const timeoutId = setTimeout(checkAccount, 500);
    return () => clearTimeout(timeoutId);
  }, [guestEmail, guestPhoneNumber, isAuthenticated]);

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

  const validateDeliveryStep = (): string | null => {
    // For guest checkout, validate guest information
    if (!isAuthenticated) {
      if (!guestEmail.trim()) {
        return "Email is required for guest checkout.";
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(guestEmail.trim())) {
        return "Please enter a valid email address.";
      }
      if (!guestFullName.trim()) {
        return "Full name is required for guest checkout.";
      }
      if (!guestPhoneNumber.trim()) {
        return "Phone number is required for guest checkout.";
      }
    }

    // Check if account exists for guest checkout
    if (!isAuthenticated && accountCheckResult?.exists) {
      return accountCheckResult.message || "Please log in to continue with your order.";
    }

    // Validate shipping address
    if (useExistingAddress && isAuthenticated && addresses.length > 0) {
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

  const handleContinueToReview = () => {
    setStatusError(null);
    setCurrentStep("review");
  };

  const handleBackToDelivery = () => {
    setCurrentStep("delivery");
  };

  const handleBackToPayment = () => {
    setCurrentStep("payment");
  };

  const handlePlaceOrder = async () => {
    setStatusError(null);

    const validationError = validateDeliveryStep();
    if (validationError) {
      setStatusError(validationError);
      setCurrentStep("delivery");
      return;
    }

    const payload: CheckoutPayload = {
      items: items.map((item) => ({ ...item })),
      shippingAddressId: useExistingAddress && isAuthenticated ? selectedAddressId : undefined,
      newShippingAddress: !useExistingAddress || !isAuthenticated
        ? {
            fullName: newAddress.fullName.trim(),
            phoneNumber: newAddress.phoneNumber.trim(),
            streetAddress: newAddress.streetAddress.trim(),
            aptNumber: newAddress.aptNumber?.trim() || undefined,
            city: newAddress.city.trim(),
            stateProvince: newAddress.stateProvince.trim(),
            zipCode: newAddress.zipCode.trim(),
            country: newAddress.country.trim(),
          }
        : undefined,
      saveNewAddress: !useExistingAddress && saveNewAddress && isAuthenticated,
      guestEmail: !isAuthenticated ? guestEmail.trim() : undefined,
      guestFullName: !isAuthenticated ? guestFullName.trim() : undefined,
      guestPhoneNumber: !isAuthenticated ? guestPhoneNumber.trim() : undefined,
    };

    try {
      setIsProcessing(true);
      const checkoutFunction = !isAuthenticated && beginGuestCheckout 
        ? beginGuestCheckout 
        : beginCheckout;
      const result = await checkoutFunction(payload);

      if (result.success && result.checkoutUrl) {
        clearCart();
        window.location.href = result.checkoutUrl;
        return;
      }

      setStatusError(
        result.message || "Unable to start checkout. Please try again."
      );
    } catch (error) {
      console.error("Failed to start checkout:", error);
      setStatusError(
        error instanceof Error
          ? error.message
          : "Unexpected error starting checkout. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Your cart is empty
            </h2>
            <Link
              href="/"
              className="inline-block bg-orange-500 text-white px-6 py-2 rounded-md hover:bg-orange-600 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </>
    );
  }

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
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Checkout Content */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md">
                {statusError && (
                  <div className="border-b border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-700">{statusError}</p>
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
                    guestEmail={guestEmail}
                    setGuestEmail={setGuestEmail}
                    guestFullName={guestFullName}
                    setGuestFullName={setGuestFullName}
                    guestPhoneNumber={guestPhoneNumber}
                    setGuestPhoneNumber={setGuestPhoneNumber}
                    accountCheckResult={accountCheckResult}
                    isCheckingAccount={isCheckingAccount}
                    onContinue={handleContinueToPayment}
                  />
                )}

                {currentStep === "payment" && (
                  <PaymentMethodStep
                    onContinue={handleContinueToReview}
                    onBack={handleBackToDelivery}
                  />
                )}

                {currentStep === "review" && (
                  <ReviewOrderStep
                    items={items}
                    shippingAddress={
                      useExistingAddress && isAuthenticated && addresses.length > 0
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
                    guestEmail={guestEmail}
                    guestFullName={guestFullName}
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
            <div className="lg:col-span-1">
              <OrderSummary
                items={items}
                subtotal={subtotal}
                itemCount={itemCount}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

