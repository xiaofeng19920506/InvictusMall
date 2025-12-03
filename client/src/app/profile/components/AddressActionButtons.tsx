import Link from "next/link";
import { deleteAddressAction, setDefaultAddressAction } from "./addressActions";
import styles from "./AddressActionButtons.module.scss";

interface AddressActionButtonsProps {
  addressId: string;
  isDefault: boolean;
  editHref: string;
  addressLabel?: string;
}

export default function AddressActionButtons({
  addressId,
  isDefault,
  editHref,
  addressLabel,
}: AddressActionButtonsProps) {
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
        <form action={setDefaultAddressAction} className={styles.form}>
          <input type="hidden" name="addressId" value={addressId} />
          <button
            type="submit"
            className={`${styles.button} ${styles.setDefault}`}
          >
            Set Default
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


