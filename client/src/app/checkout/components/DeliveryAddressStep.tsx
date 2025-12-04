"use client";

import Link from "next/link";
import type { ShippingAddress } from "@/lib/server-api";
import type { CheckoutShippingAddressInput } from "../../cart/types";
import styles from "./DeliveryAddressStep.module.scss";

interface DeliveryAddressStepProps {
  isAuthenticated: boolean;
  addresses: ShippingAddress[];
  useExistingAddress: boolean;
  setUseExistingAddress: (value: boolean) => void;
  selectedAddressId: string;
  setSelectedAddressId: (id: string) => void;
  newAddress: CheckoutShippingAddressInput;
  setNewAddress: (address: CheckoutShippingAddressInput | ((prev: CheckoutShippingAddressInput) => CheckoutShippingAddressInput)) => void;
  saveNewAddress: boolean;
  setSaveNewAddress: (value: boolean) => void;
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
  onContinue,
}: DeliveryAddressStepProps) {
  const handleNewAddressChange = (
    field: keyof CheckoutShippingAddressInput,
    value: string
  ) => {
    setNewAddress((prev: CheckoutShippingAddressInput) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>
        Select a delivery address
      </h2>

      {/* Address Selection */}
      <div className={styles.addressOptions}>
        {isAuthenticated && addresses.length > 0 && (
          <>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="address-mode"
                checked={useExistingAddress}
                onChange={() => setUseExistingAddress(true)}
                className={styles.radioInput}
              />
              Use a saved address
            </label>

            {useExistingAddress && (
              <div className={styles.addressList}>
                {addresses.map((address) => (
                  <label
                    key={address.id}
                    className={`${styles.addressCard} ${
                      selectedAddressId === address.id
                        ? styles.selected
                        : ''
                    }`}
                  >
                    <div className={styles.addressCardContent}>
                      <input
                        type="radio"
                        name="shipping-address"
                        value={address.id}
                        checked={selectedAddressId === address.id}
                        onChange={() => setSelectedAddressId(address.id)}
                        className={styles.addressRadio}
                      />
                      <div className={styles.addressDetails}>
                        <p className={styles.addressLabel}>
                          {address.label || address.fullName}
                        </p>
                        <p className={styles.addressLine}>
                          {address.streetAddress}
                          {address.aptNumber ? `, ${address.aptNumber}` : ""}
                        </p>
                        <p className={styles.addressLine}>
                          {address.city}, {address.stateProvince} {address.zipCode}
                        </p>
                        <p className={styles.addressLine}>{address.country}</p>
                        {address.isDefault && (
                          <span className={styles.defaultBadge}>
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="address-mode"
                checked={!useExistingAddress}
                onChange={() => setUseExistingAddress(false)}
                className={styles.radioInput}
              />
              Use a new address
            </label>
          </>
        )}

        {(!useExistingAddress || addresses.length === 0) && (
<<<<<<< HEAD
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
=======
          <div className={styles.newAddressForm}>
            <h3 className={styles.formTitle}>
              Add a new address
            </h3>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>
                  Full Name <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newAddress.fullName}
                  onChange={(e) => handleNewAddressChange("fullName", e.target.value)}
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>
                  Phone Number <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="tel"
                  value={newAddress.phoneNumber}
                  onChange={(e) => handleNewAddressChange("phoneNumber", e.target.value)}
                  className={styles.formInput}
                />
              </div>

              <div className={`${styles.formField} ${styles.fullWidthField}`}>
                <label className={styles.formLabel}>
                  Street Address <span style={{ color: 'red' }}>*</span>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                </label>
                <input
                  type="text"
                  value={newAddress.streetAddress}
                  onChange={(e) => handleNewAddressChange("streetAddress", e.target.value)}
<<<<<<< HEAD
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
=======
                  className={styles.formInput}
                />
              </div>

              <div className={`${styles.formField} ${styles.fullWidthField}`}>
                <label className={styles.formLabel}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                  Apartment, suite, etc. (optional)
                </label>
                <input
                  type="text"
                  value={newAddress.aptNumber || ""}
                  onChange={(e) => handleNewAddressChange("aptNumber", e.target.value)}
<<<<<<< HEAD
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
=======
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>
                  City <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newAddress.city}
                  onChange={(e) => handleNewAddressChange("city", e.target.value)}
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>
                  State / Province <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newAddress.stateProvince}
                  onChange={(e) => handleNewAddressChange("stateProvince", e.target.value)}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>
                  ZIP / Postal Code <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newAddress.zipCode}
                  onChange={(e) => handleNewAddressChange("zipCode", e.target.value)}
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>
                  Country <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newAddress.country}
                  onChange={(e) => handleNewAddressChange("country", e.target.value)}
                  className={styles.formInput}
                />
              </div>

              {isAuthenticated && (
                <label className={styles.checkboxLabel}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                  <input
                    type="checkbox"
                    checked={saveNewAddress}
                    onChange={(e) => setSaveNewAddress(e.target.checked)}
<<<<<<< HEAD
                    className="h-4 w-4 text-orange-500 focus:ring-orange-500"
=======
                    className={styles.checkboxInput}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                  />
                  Save this address for future orders
                </label>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Continue Button */}
<<<<<<< HEAD
      <div className="mt-6 flex justify-end">
        <button
          onClick={onContinue}
          className="bg-orange-500 text-white px-6 py-2 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors font-medium"
        >
          Continue to payment
        </button>
      </div>
=======
      <button
        onClick={onContinue}
        className={styles.continueButton}
      >
        Continue to payment
      </button>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
    </div>
  );
}

