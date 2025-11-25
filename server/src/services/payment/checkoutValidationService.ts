import { CheckoutPayload, PendingOrderGroup } from "./types";

export function validateCheckoutPayload(payload: CheckoutPayload): {
  isValid: boolean;
  error?: string;
} {
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return { isValid: false, error: "Your cart is empty." };
  }

  const sanitizedItems = payload.items
    .map((item) => ({
      ...item,
      quantity: Number(item.quantity) || 0,
      price: Number(item.price) || 0,
      productImage:
        typeof item.productImage === "string" && item.productImage.trim()
          ? item.productImage.trim()
          : undefined,
    }))
    .filter((item) => item.quantity > 0 && item.price > 0);

  if (sanitizedItems.length === 0) {
    return {
      isValid: false,
      error: "All items in your cart have invalid quantities or prices.",
    };
  }

  return { isValid: true };
}

export function validateGuestCheckoutPayload(payload: CheckoutPayload): {
  isValid: boolean;
  error?: string;
} {
  // Validate guest information
  if (!payload.guestEmail || !payload.guestEmail.trim()) {
    return { isValid: false, error: "Email is required for guest checkout." };
  }

  if (!payload.guestFullName || !payload.guestFullName.trim()) {
    return {
      isValid: false,
      error: "Full name is required for guest checkout.",
    };
  }

  if (!payload.guestPhoneNumber || !payload.guestPhoneNumber.trim()) {
    return {
      isValid: false,
      error: "Phone number is required for guest checkout.",
    };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(payload.guestEmail.trim())) {
    return {
      isValid: false,
      error: "Please provide a valid email address.",
    };
  }

  // Validate shipping address
  if (!payload.newShippingAddress) {
    return {
      isValid: false,
      error: "Shipping address is required for guest checkout.",
    };
  }

  const address = payload.newShippingAddress;
  const trimmedAddress = {
    fullName: address.fullName.trim(),
    phoneNumber: address.phoneNumber.trim(),
    streetAddress: address.streetAddress.trim(),
    aptNumber: address.aptNumber?.trim() || undefined,
    city: address.city.trim(),
    stateProvince: address.stateProvince.trim(),
    zipCode: address.zipCode.trim(),
    country: address.country.trim(),
  };

  if (
    !trimmedAddress.fullName ||
    !trimmedAddress.phoneNumber ||
    !trimmedAddress.streetAddress ||
    !trimmedAddress.city ||
    !trimmedAddress.stateProvince ||
    !trimmedAddress.zipCode ||
    !trimmedAddress.country
  ) {
    return {
      isValid: false,
      error: "Please complete all required shipping address fields.",
    };
  }

  return { isValid: true };
}

export function groupItemsByStore(
  items: CheckoutPayload["items"]
): Map<string, PendingOrderGroup> {
  const itemsByStore = new Map<string, PendingOrderGroup>();

  for (const item of items) {
    if (!itemsByStore.has(item.storeId)) {
      itemsByStore.set(item.storeId, {
        storeId: item.storeId,
        storeName: item.storeName,
        items: [],
      });
    }

    itemsByStore.get(item.storeId)!.items.push({
      productId: item.productId,
      productName: item.productName,
      productImage: item.productImage,
      quantity: item.quantity,
      price: item.price,
    });
  }

  return itemsByStore;
}

