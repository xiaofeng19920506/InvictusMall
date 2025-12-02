import Link from "next/link";
import AddressModalCloseButton from "./AddressModalCloseButton";
import { ShippingAddress } from "@/lib/server-api";
import styles from "./AddressModal.module.scss";

interface AddressModalProps {
  isOpen: boolean;
  isEditing: boolean;
  editingAddress?: ShippingAddress | null;
  closeHref: string;
  createAddressAction: (formData: FormData) => Promise<void>;
  updateAddressAction: (formData: FormData) => Promise<void>;
  successRedirect: string;
  errorRedirect: string;
  errorMessage?: string;
}

export default function AddressModal({
  isOpen,
  isEditing,
  editingAddress,
  closeHref,
  createAddressAction,
  updateAddressAction,
  successRedirect,
  errorRedirect,
  errorMessage,
}: AddressModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h3 className={styles.title}>
              {isEditing ? "Edit Address" : "Add Address"}
            </h3>
            <p className={styles.subtitle}>
              {isEditing
                ? "Update the address information below."
                : "Enter the address information below."}
            </p>
          </div>
          <AddressModalCloseButton
            href={closeHref}
            aria-label="Close address modal"
          />
        </div>

        <form
          action={isEditing ? updateAddressAction : createAddressAction}
          className={styles.form}
        >
          {errorMessage && (
            <div className={styles.errorMessage}>
              {errorMessage}
            </div>
          )}
          <input type="hidden" name="successRedirect" value={successRedirect} />
          <input type="hidden" name="errorRedirect" value={errorRedirect} />
          {isEditing && editingAddress && (
            <input type="hidden" name="addressId" value={editingAddress.id} />
          )}

          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label
                htmlFor="label"
                className={styles.formLabel}
              >
                Label (optional)
              </label>
              <input
                type="text"
                id="label"
                name="label"
                defaultValue={editingAddress?.label ?? ""}
                className={styles.formInput}
                placeholder="e.g., Home, Work, Office"
              />
            </div>

            <div className={styles.formField}>
              <label
                htmlFor="fullName"
                className={styles.formLabel}
              >
                Full Name *
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                defaultValue={editingAddress?.fullName ?? ""}
                required
                className={styles.formInput}
                placeholder="John Doe"
              />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label
                htmlFor="phoneNumber"
                className={styles.formLabel}
              >
                Phone Number *
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                defaultValue={editingAddress?.phoneNumber ?? ""}
                required
                minLength={10}
                className={styles.formInput}
                placeholder="1234567890"
              />
            </div>

            <div className={styles.formField}>
              <label
                htmlFor="aptNumber"
                className={styles.formLabel}
              >
                Apt/Suite (optional)
              </label>
              <input
                type="text"
                id="aptNumber"
                name="aptNumber"
                defaultValue={editingAddress?.aptNumber ?? ""}
                className={styles.formInput}
              />
            </div>
          </div>

          <div className={styles.formField}>
            <label
              htmlFor="streetAddress"
              className={styles.formLabel}
            >
              Street Address *
            </label>
            <input
              type="text"
              id="streetAddress"
              name="streetAddress"
              defaultValue={editingAddress?.streetAddress ?? ""}
              required
              className={styles.formInput}
              placeholder="123 Main St"
              autoComplete="off"
            />
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label
                htmlFor="city"
                className={styles.formLabel}
              >
                City *
              </label>
              <input
                type="text"
                id="city"
                name="city"
                defaultValue={editingAddress?.city ?? ""}
                required
                className={styles.formInput}
              />
            </div>
            <div className={styles.formField}>
              <label
                htmlFor="stateProvince"
                className={styles.formLabel}
              >
                State/Province *
              </label>
              <input
                type="text"
                id="stateProvince"
                name="stateProvince"
                defaultValue={editingAddress?.stateProvince ?? ""}
                required
                className={styles.formInput}
              />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label
                htmlFor="zipCode"
                className={styles.formLabel}
              >
                ZIP Code *
              </label>
              <input
                type="text"
                id="zipCode"
                name="zipCode"
                defaultValue={editingAddress?.zipCode ?? ""}
                required
                className={styles.formInput}
              />
            </div>
            <div className={styles.formField}>
              <label
                htmlFor="country"
                className={styles.formLabel}
              >
                Country *
              </label>
              <select
                id="country"
                name="country"
                defaultValue={editingAddress?.country ?? "USA"}
                required
                className={styles.formSelect}
              >
                <option value="USA">United States</option>
                <option value="Canada">Canada</option>
                <option value="Mexico">Mexico</option>
              </select>
            </div>
          </div>

          <div className={styles.checkboxWrapper}>
            <input
              type="checkbox"
              id="isDefault"
              name="isDefault"
              defaultChecked={editingAddress?.isDefault ?? false}
              className={styles.checkbox}
            />
            <label
              htmlFor="isDefault"
              className={styles.checkboxLabel}
            >
              Set as default address
            </label>
          </div>

          <div className={styles.actions}>
            <Link
              href={closeHref}
              scroll={false}
              className={styles.cancelButton}
            >
              Cancel
            </Link>
            <button
              type="submit"
              className={styles.submitButton}
            >
              {isEditing ? "Update Address" : "Save Address"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
