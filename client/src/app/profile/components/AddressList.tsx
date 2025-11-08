import AddressActionButtons from "./AddressActionButtons";
import { ShippingAddress } from "@/lib/server-api";

interface AddressListProps {
  addresses: ShippingAddress[];
  getEditHref: (id: string) => string;
  deleteAddressAction: (formData: FormData) => Promise<void>;
  setDefaultAddressAction: (formData: FormData) => Promise<void>;
}

export default function AddressList({
  addresses,
  getEditHref,
  deleteAddressAction,
  setDefaultAddressAction,
}: AddressListProps) {
  if (addresses.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        <p className="text-base font-medium">No addresses saved yet.</p>
        <p className="text-sm mt-2">Add your first address to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
          <div
            key={address.id}
            className="border border-gray-200 rounded-lg p-4 flex items-start justify-between gap-4"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {address.label?.trim() && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                    {address.label}
                  </span>
                )}
                <h3 className="font-semibold text-gray-900">
                  {address.fullName}
                </h3>
                {address.isDefault ? (
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">
                    Default
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-gray-600 mb-1">
                {address.phoneNumber}
              </p>
              <p className="text-sm text-gray-700">
                {address.streetAddress}
                {address.aptNumber && `, Apt ${address.aptNumber}`}
              </p>
              <p className="text-sm text-gray-700">
                {address.city}, {address.stateProvince} {address.zipCode}
              </p>
              <p className="text-sm text-gray-700">{address.country}</p>
            </div>

            <AddressActionButtons
              addressId={address.id}
              isDefault={address.isDefault}
              editHref={editHref}
              deleteAction={deleteAddressAction}
              setDefaultAction={setDefaultAddressAction}
              addressLabel={addressLabelForModal}
            />
          </div>
        );
      })}
    </div>
  );
}
