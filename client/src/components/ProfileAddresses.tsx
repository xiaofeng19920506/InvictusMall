'use client';

import { useRouter } from "next/navigation";
import AddressManager from "./AddressManager";
import shippingAddressService, { ShippingAddress } from "@/services/shippingAddress";

interface ProfileAddressesProps {
  initialAddresses: ShippingAddress[];
}

export default function ProfileAddresses({ initialAddresses }: ProfileAddressesProps) {
  const router = useRouter();

  const handleSaveAddress = async (
    address: Omit<ShippingAddress, "id" | "userId" | "createdAt" | "updatedAt">
  ) => {
    try {
      const response = await shippingAddressService.createAddress(address);
      if (response.success) {
        // Refresh the page to refetch data from server
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
        // Refresh the page to refetch data from server
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
        // Refresh the page to refetch data from server
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
        // Refresh the page to refetch data from server
        router.refresh();
      } else {
        throw new Error(response.message || 'Failed to set default address');
      }
    } catch (error: any) {
      console.error("Failed to set default address:", error);
      throw error;
    }
  };

  return (
    <AddressManager
      addresses={initialAddresses}
      loading={false}
      onSave={handleSaveAddress}
      onUpdate={handleUpdateAddress}
      onDelete={handleDeleteAddress}
      onSetDefault={handleSetDefaultAddress}
    />
  );
}

