import Link from "next/link";
import AddressModalCloseButton from "./AddressModalCloseButton";
import { ShippingAddress } from "@/lib/server-api";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 px-4 py-8">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-2xl">
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-6 py-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {isEditing ? "Edit Address" : "Add Address"}
            </h3>
            <p className="text-sm text-gray-500">
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
          className="px-6 py-6 space-y-4"
        >
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {errorMessage}
            </div>
          )}
          <input type="hidden" name="successRedirect" value={successRedirect} />
          <input type="hidden" name="errorRedirect" value={errorRedirect} />
          {isEditing && editingAddress && (
            <input type="hidden" name="addressId" value={editingAddress.id} />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="label"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Label (optional)
              </label>
              <input
                type="text"
                id="label"
                name="label"
                defaultValue={editingAddress?.label ?? ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g., Home, Work, Office"
              />
            </div>

            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Full Name *
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                defaultValue={editingAddress?.fullName ?? ""}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="phoneNumber"
                className="block text-sm font-medium text-gray-700 mb-1"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="1234567890"
              />
            </div>

            <div>
              <label
                htmlFor="aptNumber"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Apt/Suite (optional)
              </label>
              <input
                type="text"
                id="aptNumber"
                name="aptNumber"
                defaultValue={editingAddress?.aptNumber ?? ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="streetAddress"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Street Address *
            </label>
            <input
              type="text"
              id="streetAddress"
              name="streetAddress"
              defaultValue={editingAddress?.streetAddress ?? ""}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="123 Main St"
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="city"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                City *
              </label>
              <input
                type="text"
                id="city"
                name="city"
                defaultValue={editingAddress?.city ?? ""}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label
                htmlFor="stateProvince"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                State/Province *
              </label>
              <input
                type="text"
                id="stateProvince"
                name="stateProvince"
                defaultValue={editingAddress?.stateProvince ?? ""}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="zipCode"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                ZIP Code *
              </label>
              <input
                type="text"
                id="zipCode"
                name="zipCode"
                defaultValue={editingAddress?.zipCode ?? ""}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label
                htmlFor="country"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Country *
              </label>
              <select
                id="country"
                name="country"
                defaultValue={editingAddress?.country ?? "USA"}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="USA">United States</option>
                <option value="Canada">Canada</option>
                <option value="Mexico">Mexico</option>
              </select>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isDefault"
              name="isDefault"
              defaultChecked={editingAddress?.isDefault ?? false}
              className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded cursor-pointer"
            />
            <label
              htmlFor="isDefault"
              className="ml-2 text-sm text-gray-700 cursor-pointer"
            >
              Set as default address
            </label>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end sm:gap-3 gap-2 pt-2">
            <Link
              href={closeHref}
              scroll={false}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-orange-500 text-white hover:bg-orange-600 transition-colors cursor-pointer"
            >
              {isEditing ? "Update Address" : "Save Address"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
