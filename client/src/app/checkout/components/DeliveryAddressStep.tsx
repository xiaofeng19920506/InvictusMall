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
                </label>
                <input
                  type="text"
                  value={newAddress.streetAddress}
                  onChange={(e) => handleNewAddressChange("streetAddress", e.target.value)}
                  className={styles.formInput}
                />
              </div>

              <div className={`${styles.formField} ${styles.fullWidthField}`}>
                <label className={styles.formLabel}>
                  Apartment, suite, etc. (optional)
                </label>
                <input
                  type="text"
                  value={newAddress.aptNumber || ""}
                  onChange={(e) => handleNewAddressChange("aptNumber", e.target.value)}
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
                  <input
                    type="checkbox"
                    checked={saveNewAddress}
                    onChange={(e) => setSaveNewAddress(e.target.checked)}
                    className={styles.checkboxInput}
                  />
                  Save this address for future orders
                </label>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Continue Button */}
      <button
        onClick={onContinue}
        className={styles.continueButton}
      >
        Continue to payment
      </button>
    </div>
  );
}

