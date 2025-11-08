import type { CartItem } from "@/contexts/CartContext";

export interface CheckoutCartItem extends CartItem {}

export interface CheckoutShippingAddressInput {
  fullName: string;
  phoneNumber: string;
  streetAddress: string;
  aptNumber?: string;
  city: string;
  stateProvince: string;
  zipCode: string;
  country: string;
}

export interface CheckoutPayload {
  items: CheckoutCartItem[];
  shippingAddressId?: string;
  newShippingAddress?: CheckoutShippingAddressInput;
  saveNewAddress?: boolean;
}

export interface CheckoutSessionResult {
  success: boolean;
  message?: string;
  checkoutUrl?: string;
}

