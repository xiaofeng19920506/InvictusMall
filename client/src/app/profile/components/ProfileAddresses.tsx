import AddressManager from "./AddressManager";
import {
  createAddressAction,
  updateAddressAction,
} from "./addressActions";
import { ShippingAddress } from "@/lib/server-api";
import styles from "./ProfileAddresses.module.scss";

interface ProfileAddressesProps {
  initialAddresses: ShippingAddress[];
  showAddForm?: boolean;
  editAddressId?: string | null;
  feedbackStatus?: "success" | "error";
  feedbackMessage?: string;
}

export default function ProfileAddresses({
  initialAddresses,
  showAddForm = false,
  editAddressId = null,
  feedbackStatus,
  feedbackMessage,
}: ProfileAddressesProps) {
  const editingAddress = editAddressId
    ? initialAddresses.find((address) => address.id === editAddressId) || null
    : null;

  const showModal = showAddForm || Boolean(editingAddress);
  const basePath = "/profile?tab=addresses";
  const addHref = `${basePath}&showAdd=1`;
  const closeHref = basePath;

  const errorMessage =
    feedbackStatus === "error" && feedbackMessage ? feedbackMessage : undefined;

  return (
    <div className={styles.container}>
      <AddressManager
        addresses={initialAddresses}
        showModal={showModal}
        editingAddress={editingAddress}
        addHref={addHref}
        closeHref={closeHref}
        basePath={basePath}
        createAddressAction={createAddressAction}
        updateAddressAction={updateAddressAction}
        errorMessage={errorMessage}
      />
    </div>
  );
}
