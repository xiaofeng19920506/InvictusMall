 'use client';

import { useRouter, useSearchParams } from "next/navigation";
import AddressManager from "./AddressManager";
import shippingAddressService, { ShippingAddress } from "@/services/shippingAddress";

interface ProfileAddressesProps {
  initialAddresses: ShippingAddress[];
  showAddForm?: boolean;
}

export default function ProfileAddresses({ initialAddresses, showAddForm = false }: ProfileAddressesProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSaveAddress = async (
    address: Omit<ShippingAddress, "id" | "userId" | "createdAt" | "updatedAt">
  ) => {
    try {
      const response = await shippingAddressService.createAddress(address);
      if (response.success) {
        router.refresh();
      } else {
        throw new Error(response.message || 'Failed to save address');
      }
    } catch (error: any) {
      console.error("Failed to save address:", error);
      throw error;
    }
  };

  const handleUpdateAddress = async (
    id: string,
    address: Partial<Omit<ShippingAddress, "id" | "userId" | "createdAt" | "updatedAt">>
  ) => {
    try {
      const response = await shippingAddressService.updateAddress(id, address);
      if (response.success) {
        router.refresh();
      } else {
        throw new Error(response.message || 'Failed to update address');
      }
    } catch (error: any) {
      console.error("Failed to update address:", error);
      throw error;
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const response = await shippingAddressService.deleteAddress(id);
      if (response.success) {
        router.refresh();
      } else {
        throw new Error(response.message || 'Failed to delete address');
      }
    } catch (error: any) {
      console.error("Failed to delete address:", error);
      throw error;
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      const response = await shippingAddressService.setDefaultAddress(id);
      if (response.success) {
        router.refresh();
      } else {
        throw new Error(response.message || 'Failed to set default address');
      }
    } catch (error: any) {
      console.error("Failed to set default address:", error);
      throw error;
    }
  };

  const toggleAddForm = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "addresses");

    if (showAddForm) {
      params.delete("showAdd");
    } else {
      params.set("showAdd", "1");
    }

    const queryString = params.toString();
    router.push(queryString ? `?${queryString}` : "?tab=addresses", { scroll: false });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Saved Addresses</h2>
        <button
          onClick={toggleAddForm}
          className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors cursor-pointer"
        >
          {showAddForm ? "Hide Add Address" : "+ Add Address"}
        </button>
      </div>

      <AddressManager
        addresses={initialAddresses}
        loading={false}
        onSave={handleSaveAddress}
        onUpdate={handleUpdateAddress}
        onDelete={handleDeleteAddress}
        onSetDefault={handleSetDefaultAddress}
        showAddButton={false}
      />
    </div>
  );
}
