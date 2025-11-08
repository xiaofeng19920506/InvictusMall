import AddressAddButton from "./AddressAddButton";
import AddressList from "./AddressList";
import AddressModal from "./AddressModal";
import { ShippingAddress } from "@/lib/server-api";

interface AddressManagerProps {
  addresses: ShippingAddress[];
  showModal: boolean;
  editingAddress?: ShippingAddress | null;
  addHref: string;
  closeHref: string;
  getEditHref: (id: string) => string;
  createAddressAction: (formData: FormData) => Promise<void>;
  updateAddressAction: (formData: FormData) => Promise<void>;
  deleteAddressAction: (formData: FormData) => Promise<void>;
  setDefaultAddressAction: (formData: FormData) => Promise<void>;
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
  deleteAddressAction,
  setDefaultAddressAction,
  errorMessage,
}: AddressManagerProps) {
  const isEditing = Boolean(editingAddress);
  const successRedirect = closeHref;
  const errorRedirect =
    isEditing && editingAddress ? getEditHref(editingAddress.id) : addHref;

  return (
    <>
      <section className="bg-white rounded-lg shadow-md">
        <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Addresses</h2>
          </div>
          <AddressAddButton href={addHref} />
        </header>

        <div className="px-6 py-6 space-y-4">
          <AddressList
            addresses={addresses}
            getEditHref={getEditHref}
            deleteAddressAction={deleteAddressAction}
            setDefaultAddressAction={setDefaultAddressAction}
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
