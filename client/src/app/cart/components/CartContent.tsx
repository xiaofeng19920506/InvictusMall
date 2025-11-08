"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import Header from "@/components/common/Header";
import Link from "next/link";
import type { ShippingAddress } from "@/lib/server-api";
import type {
  CheckoutPayload,
  CheckoutSessionResult,
  CheckoutShippingAddressInput,
} from "../types";

interface CartContentProps {
  addresses: ShippingAddress[];
  defaultAddressId?: string;
  beginCheckout: (payload: CheckoutPayload) => Promise<CheckoutSessionResult>;
}

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

export default function CartContent({
  addresses,
  defaultAddressId,
  beginCheckout,
}: CartContentProps) {
  const { items, updateQuantity, removeItem, clearCart } = useCart();
  const { isAuthenticated } = useAuth();

  const [statusError, setStatusError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [useExistingAddress, setUseExistingAddress] = useState(
    addresses.length > 0
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    defaultAddressId || addresses[0]?.id || ""
  );
  const [newAddress, setNewAddress] =
    useState<CheckoutShippingAddressInput>(EMPTY_ADDRESS);
  const [saveNewAddress, setSaveNewAddress] = useState(true);

  useEffect(() => {
    setUseExistingAddress(addresses.length > 0);
    setSelectedAddressId(defaultAddressId || addresses[0]?.id || "");
  }, [addresses, defaultAddressId]);

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

  const handleNewAddressChange = (
    field: keyof CheckoutShippingAddressInput,
    value: string
  ) => {
    setNewAddress((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateShipping = (): string | null => {
    if (items.length === 0) {
      return "Your cart is empty.";
    }

    if (useExistingAddress) {
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

  const handleCheckout = async () => {
    setStatusError(null);

    const validationError = validateShipping();
    if (validationError) {
      setStatusError(validationError);
      return;
    }

    const payload: CheckoutPayload = {
      items: items.map((item) => ({ ...item })),
      shippingAddressId: useExistingAddress ? selectedAddressId : undefined,
      newShippingAddress: !useExistingAddress
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
      saveNewAddress: !useExistingAddress && saveNewAddress,
    };

    try {
      setIsProcessing(true);
      const result = await beginCheckout(payload);

      if (result.success && result.checkoutUrl) {
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

  if (!isAuthenticated) {
    return (
      <>
        <Header />
        <ProtectedRoute>
          <div />
        </ProtectedRoute>
      </>
    );
  }

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
                    {item.productImage && (
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="w-24 h-24 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {item.productName}
                          </h3>
                          <p className="text-sm text-gray-600">{item.storeName}</p>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-4">
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
                    Shipping Address
                  </h2>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
                      <input
                        type="radio"
                        name="address-mode"
                        value="existing"
                        disabled={addresses.length === 0}
                        checked={useExistingAddress && addresses.length > 0}
                        onChange={() => setUseExistingAddress(true)}
                        className="h-4 w-4 text-orange-500 focus:ring-orange-500"
                      />
                      Use a saved address
                    </label>

                    {useExistingAddress && addresses.length > 0 && (
                      <div className="space-y-2 pl-7">
                        {addresses.map((address) => (
                          <label
                            key={address.id}
                            className={`block rounded-lg border p-4 text-sm transition-colors ${
                              selectedAddressId === address.id
                                ? "border-orange-500 bg-orange-50"
                                : "border-gray-200 hover:border-orange-300"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                name="shipping-address"
                                value={address.id}
                                checked={selectedAddressId === address.id}
                                onChange={() => setSelectedAddressId(address.id)}
                                className="mt-1 h-4 w-4 text-orange-500 focus:ring-orange-500"
                              />
                              <div>
                                <p className="font-medium text-gray-900">
                                  {address.label || address.fullName}
                                </p>
                                <p className="text-gray-600">
                                  {address.streetAddress}
                                  {address.aptNumber ? `, ${address.aptNumber}` : ""}
                                </p>
                                <p className="text-gray-600">
                                  {address.city}, {address.stateProvince}{" "}
                                  {address.zipCode}
                                </p>
                                <p className="text-gray-600">{address.country}</p>
                                {address.isDefault && (
                                  <span className="mt-2 inline-block rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                                    Default
                                  </span>
                                )}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}

                    <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
                      <input
                        type="radio"
                        name="address-mode"
                        value="new"
                        checked={!useExistingAddress || addresses.length === 0}
                        onChange={() => setUseExistingAddress(false)}
                        className="h-4 w-4 text-orange-500 focus:ring-orange-500"
                      />
                      Use a new shipping address
                    </label>

                    {(!useExistingAddress || addresses.length === 0) && (
                      <div className="mt-3 space-y-3 rounded-lg border border-gray-200 p-4">
                        <div className="grid gap-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">
                                Full Name
                              </label>
                              <input
                                type="text"
                                value={newAddress.fullName}
                                onChange={(event) =>
                                  handleNewAddressChange(
                                    "fullName",
                                    event.target.value
                                  )
                                }
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">
                                Phone Number
                              </label>
                              <input
                                type="tel"
                                value={newAddress.phoneNumber}
                                onChange={(event) =>
                                  handleNewAddressChange(
                                    "phoneNumber",
                                    event.target.value
                                  )
                                }
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                              Street Address
                            </label>
                            <input
                              type="text"
                              value={newAddress.streetAddress}
                              onChange={(event) =>
                                handleNewAddressChange(
                                  "streetAddress",
                                  event.target.value
                                )
                              }
                              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                              Apartment, suite, etc. (optional)
                            </label>
                            <input
                              type="text"
                              value={newAddress.aptNumber || ""}
                              onChange={(event) =>
                                handleNewAddressChange(
                                  "aptNumber",
                                  event.target.value
                                )
                              }
                              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">
                                City
                              </label>
                              <input
                                type="text"
                                value={newAddress.city}
                                onChange={(event) =>
                                  handleNewAddressChange(
                                    "city",
                                    event.target.value
                                  )
                                }
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">
                                State / Province
                              </label>
                              <input
                                type="text"
                                value={newAddress.stateProvince}
                                onChange={(event) =>
                                  handleNewAddressChange(
                                    "stateProvince",
                                    event.target.value
                                  )
                                }
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                              />
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">
                                ZIP / Postal Code
                              </label>
                              <input
                                type="text"
                                value={newAddress.zipCode}
                                onChange={(event) =>
                                  handleNewAddressChange(
                                    "zipCode",
                                    event.target.value
                                  )
                                }
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">
                                Country
                              </label>
                              <input
                                type="text"
                                value={newAddress.country}
                                onChange={(event) =>
                                  handleNewAddressChange(
                                    "country",
                                    event.target.value
                                  )
                                }
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                              />
                            </div>
                          </div>
                        </div>

                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={saveNewAddress}
                            onChange={(event) =>
                              setSaveNewAddress(event.target.checked)
                            }
                            className="h-4 w-4 text-orange-500 focus:ring-orange-500"
                          />
                          Save this address for future orders
                        </label>
                      </div>
                    )}
                  </div>
                </section>

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

                {statusError && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {statusError}
                  </div>
                )}

                <button
                  onClick={handleCheckout}
                  disabled={isProcessing || items.length === 0}
                  className="w-full bg-orange-500 text-white py-3 px-4 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {isProcessing ? "Redirecting..." : "Place Order"}
                </button>

                <button
                  onClick={clearCart}
                  disabled={isProcessing || items.length === 0}
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


