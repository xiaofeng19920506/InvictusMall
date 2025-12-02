"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ConfirmDeleteModal from "@/components/common/ConfirmDeleteModal";
import styles from "./AddressActionButtons.module.scss";

interface AddressActionButtonsProps {
  addressId: string;
  isDefault: boolean;
  editHref: string;
  deleteAction: (formData: FormData) => Promise<void>;
  setDefaultAction?: (formData: FormData) => Promise<void>;
  addressLabel?: string;
}

export default function AddressActionButtons({
  addressId,
  isDefault,
  editHref,
  deleteAction,
  setDefaultAction,
  addressLabel,
}: AddressActionButtonsProps) {
  const router = useRouter();
  const [isSettingDefault, startSettingDefault] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleEditClick = () => {
    router.push(editHref, { scroll: false });
  };

  const handleSetDefault = () => {
    if (!setDefaultAction) return;
    const formData = new FormData();
    formData.append("addressId", addressId);
    startSettingDefault(() => {
      setDefaultAction(formData)
        .then(() => {
          router.refresh();
        })
        .catch((error) => {
          console.error("Failed to set default address:", error);
        });
    });
  };

  const handleDelete = () => {
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    const formData = new FormData();
    formData.append("addressId", addressId);
    startDeleting(() => {
      deleteAction(formData)
        .then(() => {
          setConfirmOpen(false);
          router.refresh();
        })
        .catch((error) => {
          console.error("Failed to delete address:", error);
        });
    });
  };

  const handleDeleteCancel = () => {
    if (!isDeleting) {
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <div className={styles.container}>
        <button
          type="button"
          onClick={handleEditClick}
          className={`${styles.button} ${styles.edit}`}
        >
          Edit
        </button>
        {!isDefault && setDefaultAction && (
          <button
            type="button"
            onClick={handleSetDefault}
            disabled={isSettingDefault}
            className={`${styles.button} ${styles.setDefault}`}
          >
            {isSettingDefault ? "Setting..." : "Set Default"}
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          className={`${styles.button} ${styles.delete}`}
        >
          Delete
        </button>
      </div>

      <ConfirmDeleteModal
        isOpen={confirmOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        title="Delete Address"
        message={
          addressLabel
            ? `Are you sure you want to delete ${addressLabel}? This action cannot be undone.`
            : "Are you sure you want to delete this address? This action cannot be undone."
        }
      />
    </>
  );
}


