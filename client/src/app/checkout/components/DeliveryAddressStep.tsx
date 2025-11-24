"use client";

import Link from "next/link";
import type { ShippingAddress } from "@/lib/server-api";
import type { CheckoutShippingAddressInput } from "../../cart/types";

interface DeliveryAddressStepProps {
  isAuthenticated: boolean;
  addresses: ShippingAddress[];
  useExistingAddress: boolean;
  setUseExistingAddress: (value: boolean) => void;
  selectedAddressId: string;
  setSelectedAddressId: (id: string) => void;
  newAddress: CheckoutShippingAddressInput;
  setNewAddress: (address: CheckoutShippingAddressInput) => void;
  saveNewAddress: boolean;
  setSaveNewAddress: (value: boolean) => void;
  guestEmail: string;
  setGuestEmail: (value: string) => void;
  guestFullName: string;
  setGuestFullName: (value: string) => void;
  guestPhoneNumber: string;
  setGuestPhoneNumber: (value: string) => void;
  accountCheckResult: { exists: boolean; message?: string } | null;
  isCheckingAccount: boolean;
  onContinue: () => void;
}

export default function DeliveryAddressStep({
  isAuthenticated,
  addresses,
  useExistingAddress,
  setUseExistingAddress,
  selectedAddressId,
  setSelectedAddressId,
  newAddress,
  setNewAddress,
  saveNewAddress,
  setSaveNewAddress,
  guestEmail,
  setGuestEmail,
  guestFullName,
  setGuestFullName,
  guestPhoneNumber,
  setGuestPhoneNumber,
  accountCheckResult,
  isCheckingAccount,
  onContinue,
}: DeliveryAddressStepProps) {
  const handleNewAddressChange = (
    field: keyof CheckoutShippingAddressInput,
    value: string
  ) => {
    setNewAddress((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        Select a delivery address
      </h2>

      {/* Guest Information */}
      {!isAuthenticated && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Guest Information
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="your.email@example.com"
              />
              {isCheckingAccount && (
                <p className="mt-1 text-xs text-gray-500">Checking...</p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={guestFullName}
                  onChange={(e) => setGuestFullName(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={guestPhoneNumber}
                  onChange={(e) => setGuestPhoneNumber(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="+1234567890"
                />
              </div>
            </div>
            {accountCheckResult?.exists && (
              <div className="rounded-md border border-orange-300 bg-orange-50 p-3 text-sm">
                <p className="font-medium text-orange-800 mb-2">
                  {accountCheckResult.message || "This email or phone number is already associated with an account."}
                </p>
                <Link
                  href="/login"
                  className="inline-block bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors text-sm font-medium"
                >
                  Log In to Continue
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Address Selection */}
      <div className="space-y-4">
        {isAuthenticated && addresses.length > 0 && (
          <>
            <label className="flex items-center gap-3 text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="radio"
                name="address-mode"
                checked={useExistingAddress}
                onChange={() => setUseExistingAddress(true)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500"
              />
              Use a saved address
            </label>

            {useExistingAddress && (
              <div className="ml-7 space-y-3">
                {addresses.map((address) => (
                  <label
                    key={address.id}
                    className={`block rounded-lg border p-4 cursor-pointer transition-colors ${
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
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {address.label || address.fullName}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {address.streetAddress}
                          {address.aptNumber ? `, ${address.aptNumber}` : ""}
                        </p>
                        <p className="text-sm text-gray-600">
                          {address.city}, {address.stateProvince} {address.zipCode}
                        </p>
                        <p className="text-sm text-gray-600">{address.country}</p>
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

            <label className="flex items-center gap-3 text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="radio"
                name="address-mode"
                checked={!useExistingAddress}
                onChange={() => setUseExistingAddress(false)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500"
              />
              Use a new address
            </label>
          </>
        )}

        {(!useExistingAddress || !isAuthenticated || addresses.length === 0) && (
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Add a new address
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newAddress.fullName}
                    onChange={(e) => handleNewAddressChange("fullName", e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={newAddress.phoneNumber}
                    onChange={(e) => handleNewAddressChange("phoneNumber", e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newAddress.streetAddress}
                  onChange={(e) => handleNewAddressChange("streetAddress", e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apartment, suite, etc. (optional)
                </label>
                <input
                  type="text"
                  value={newAddress.aptNumber || ""}
                  onChange={(e) => handleNewAddressChange("aptNumber", e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newAddress.city}
                    onChange={(e) => handleNewAddressChange("city", e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State / Province <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newAddress.stateProvince}
                    onChange={(e) => handleNewAddressChange("stateProvince", e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP / Postal Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newAddress.zipCode}
                    onChange={(e) => handleNewAddressChange("zipCode", e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newAddress.country}
                    onChange={(e) => handleNewAddressChange("country", e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              {isAuthenticated && (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={saveNewAddress}
                    onChange={(e) => setSaveNewAddress(e.target.checked)}
                    className="h-4 w-4 text-orange-500 focus:ring-orange-500"
                  />
                  Save this address for future orders
                </label>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Continue Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={onContinue}
          className="bg-orange-500 text-white px-6 py-2 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors font-medium"
        >
          Continue to payment
        </button>
      </div>
    </div>
  );
}

