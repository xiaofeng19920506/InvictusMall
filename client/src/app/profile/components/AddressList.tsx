import AddressActionButtons from "./AddressActionButtons";
import { ShippingAddress } from "@/lib/server-api";
import styles from "./AddressList.module.scss";

interface AddressListProps {
  addresses: ShippingAddress[];
  getEditHref: (id: string) => string;
}

export default function AddressList({
  addresses,
  getEditHref,
}: AddressListProps) {
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
        const editHref = getEditHref(address.id);
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
            />
          </div>
        );
      })}
    </div>
  );
}
