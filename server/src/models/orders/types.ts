export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'return_processing'
  | 'returned';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  price: number;
  subtotal: number;
  // Reservation fields (only for services)
  reservationDate?: string;
  reservationTime?: string;
  reservationNotes?: string;
  isReservation?: boolean;
}

export interface Order {
  id: string;
  userId: string | null;
  storeId: string;
  storeName: string;
  items: OrderItem[];
  totalAmount: number;
  totalRefunded?: number;
  status: OrderStatus;
  shippingAddress: {
    streetAddress: string;
    aptNumber?: string;
    city: string;
    stateProvince: string;
    zipCode: string;
    country: string;
  };
  paymentMethod: string;
  orderDate: string;
  shippedDate?: string;
  deliveredDate?: string;
  trackingNumber?: string;
  createdAt: string;
  updatedAt: string;
  stripeSessionId?: string | null;
  paymentIntentId?: string | null;
  // Guest order fields
  guestEmail?: string | null;
  guestFullName?: string | null;
  guestPhoneNumber?: string | null;
}

export interface CreateOrderRequest {
  userId?: string | null;
  storeId: string;
  storeName: string;
  items: Array<{
    productId: string;
    productName: string;
    productImage?: string;
    quantity: number;
    price: number;
    // Reservation fields (only for services)
    reservationDate?: string;
    reservationTime?: string;
    reservationNotes?: string;
    isReservation?: boolean;
  }>;
  shippingAddress: {
    streetAddress: string;
    aptNumber?: string;
    city: string;
    stateProvince: string;
    zipCode: string;
    country: string;
  };
  paymentMethod: string;
  stripeSessionId?: string | null;
  paymentIntentId?: string | null;
  status?: OrderStatus;
  // Guest order fields
  guestEmail?: string | null;
  guestFullName?: string | null;
  guestPhoneNumber?: string | null;
}

export interface UpdateOrderAfterPaymentRequest {
  status?: OrderStatus;
  paymentMethod?: string;
  stripeSessionId?: string | null;
  paymentIntentId?: string | null;
  orderDate?: Date;
  shippingAddress?: {
    streetAddress: string;
    aptNumber?: string;
    city: string;
    stateProvince: string;
    zipCode: string;
    country: string;
  };
}

