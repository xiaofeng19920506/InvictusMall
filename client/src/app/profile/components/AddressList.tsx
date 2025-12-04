"use client";

import { useState, useEffect } from "react";
import AddressActionButtons from "./AddressActionButtons";
import { ShippingAddress } from "@/lib/server-api";
import styles from "./AddressList.module.scss";

interface AddressListProps {
  addresses: ShippingAddress[];
  basePath: string;
}

export default function AddressList({
  addresses: initialAddresses,
  basePath,
}: AddressListProps) {
  const [addresses, setAddresses] = useState<ShippingAddress[]>(initialAddresses);

  // Update addresses when initialAddresses prop changes
  useEffect(() => {
    setAddresses(initialAddresses);
  }, [initialAddresses]);

  const handleDefaultChanged = (newDefaultId: string) => {
    // Update local state: set the new default and unset the old one
    setAddresses((prev) =>
      prev.map((addr) => ({
        ...addr,
        isDefault: addr.id === newDefaultId,
      }))
    );
  };
  if (addresses.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyTitle}>No addresses saved yet.</p>
        <p className={styles.emptyMessage}>Add your first address to get started.</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {addresses.map((address) => {
        const editHref = `${basePath}&showAdd=1&edit=${address.id}`;
        const addressLabelForModal = [
          address.label ? `${address.label} -` : null,
          address.fullName,
          `${address.streetAddress}${
            address.aptNumber ? `, Apt ${address.aptNumber}` : ""
          }`,
          `${address.city}, ${address.stateProvince} ${address.zipCode}`,
          address.country,
        ]
          .filter(Boolean)
          .join("\n");

        return (
          <div key={address.id} className={styles.addressCard}>
            <div className={styles.addressContent}>
              <div className={styles.addressHeader}>
                {address.label?.trim() && (
                  <span className={styles.addressLabel}>
                    {address.label}
                  </span>
                )}
                <h3 className={styles.addressName}>
                  {address.fullName}
                </h3>
                {address.isDefault ? (
                  <span className={styles.defaultBadge}>
                    Default
                  </span>
                ) : null}
              </div>
              <p className={styles.phoneNumber}>
                {address.phoneNumber}
              </p>
              <p className={styles.addressLine}>
                {address.streetAddress}
                {address.aptNumber && `, Apt ${address.aptNumber}`}
              </p>
              <p className={styles.addressLine}>
                {address.city}, {address.stateProvince} {address.zipCode}
              </p>
              <p className={styles.addressLine}>{address.country}</p>
            </div>

            <AddressActionButtons
              addressId={address.id}
              isDefault={address.isDefault}
              editHref={editHref}
              addressLabel={addressLabelForModal}
              onDefaultChanged={handleDefaultChanged}
            />
          </div>
        );
      })}
    </div>
  );
}
