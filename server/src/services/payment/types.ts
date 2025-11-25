export interface CheckoutItem {
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  price: number;
  storeId: string;
  storeName: string;
}

export interface CheckoutPayload {
  items: CheckoutItem[];
  shippingAddressId?: string;
  newShippingAddress?: {
    fullName: string;
    phoneNumber: string;
    streetAddress: string;
    aptNumber?: string;
    city: string;
    stateProvince: string;
    zipCode: string;
    country: string;
  };
  saveNewAddress?: boolean;
  // Guest checkout fields
  guestEmail?: string;
  guestFullName?: string;
  guestPhoneNumber?: string;
}

export interface PendingOrderItem {
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  price: number;
}

export interface PendingOrderGroup {
  storeId: string;
  storeName: string;
  items: PendingOrderItem[];
}

export type ResolvedShippingAddress = {
  streetAddress: string;
  aptNumber?: string;
  city: string;
  stateProvince: string;
  zipCode: string;
  country: string;
};

export class CheckoutFinalizationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "CheckoutFinalizationError";
    this.statusCode = statusCode;
  }
}

