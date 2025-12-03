import AddressAddButton from "./AddressAddButton";
import AddressList from "./AddressList";
import AddressModal from "./AddressModal";
import { ShippingAddress } from "@/lib/server-api";
import styles from "./AddressManager.module.scss";

interface AddressManagerProps {
  addresses: ShippingAddress[];
  showModal: boolean;
  editingAddress?: ShippingAddress | null;
  addHref: string;
  closeHref: string;
  getEditHref: (id: string) => string;
  createAddressAction: (formData: FormData) => Promise<void>;
  updateAddressAction: (formData: FormData) => Promise<void>;
  errorMessage?: string;
}

export default function AddressManager({
  addresses,
  showModal,
  editingAddress = null,
  addHref,
  closeHref,
  getEditHref,
  createAddressAction,
  updateAddressAction,
  errorMessage,
}: AddressManagerProps) {
  const isEditing = Boolean(editingAddress);
  const successRedirect = closeHref;
  const errorRedirect =
    isEditing && editingAddress ? getEditHref(editingAddress.id) : addHref;

  return (
    <>
      <section className={styles.section}>
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>Addresses</h2>
          </div>
          <AddressAddButton href={addHref} />
        </header>

        <div className={styles.content}>
          <AddressList
            addresses={addresses}
            getEditHref={getEditHref}
          />
        </div>
      </section>

      <AddressModal
        isOpen={showModal}
        isEditing={isEditing}
        editingAddress={editingAddress}
        closeHref={closeHref}
        createAddressAction={createAddressAction}
        updateAddressAction={updateAddressAction}
        successRedirect={successRedirect}
        errorRedirect={errorRedirect}
        errorMessage={showModal ? errorMessage : undefined}
      />
    </>
  );
}
