"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteAddressAction } from "./addressActions";
import { shippingAddressService } from "@/services/shippingAddress";
import styles from "./AddressActionButtons.module.scss";

interface AddressActionButtonsProps {
  addressId: string;
  isDefault: boolean;
  editHref: string;
  addressLabel?: string;
  onDefaultChanged?: (addressId: string) => void;
}

export default function AddressActionButtons({
  addressId,
  isDefault,
  editHref,
  addressLabel,
  onDefaultChanged,
}: AddressActionButtonsProps) {
  const [isSettingDefault, setIsSettingDefault] = useState(false);

  const handleSetDefault = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSettingDefault(true);

    try {
      const response = await shippingAddressService.setDefaultAddress(addressId);
      if (response.success) {
        // Call callback to update parent component state without page refresh
        if (onDefaultChanged) {
          onDefaultChanged(addressId);
        }
        // Optionally reload the page data silently using router.refresh()
        // But we skip it to avoid UI changes as requested
      } else {
        alert(response.message || "Failed to set default address");
      }
    } catch (error) {
      console.error("Error setting default address:", error);
      alert("Failed to set default address. Please try again.");
    } finally {
      setIsSettingDefault(false);
    }
  };

  return (
    <div className={styles.container}>
      <Link
        href={editHref}
        className={`${styles.button} ${styles.edit}`}
        scroll={false}
      >
        Edit
      </Link>
      {!isDefault && (
        <form onSubmit={handleSetDefault} className={styles.form}>
          <button
            type="submit"
            className={`${styles.button} ${styles.setDefault}`}
            disabled={isSettingDefault}
          >
            {isSettingDefault ? "Setting..." : "Set Default"}
          </button>
        </form>
      )}
      <form action={deleteAddressAction} className={styles.form}>
        <input type="hidden" name="addressId" value={addressId} />
        <button
          type="submit"
          className={`${styles.button} ${styles.delete}`}
          onClick={(e) => {
            if (
              !confirm(
                addressLabel
                  ? `Are you sure you want to delete ${addressLabel}? This action cannot be undone.`
                  : "Are you sure you want to delete this address? This action cannot be undone."
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          Delete
        </button>
      </form>
    </div>
  );
}


