// Common types for the mobile app

export interface Staff {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'owner' | 'manager' | 'employee';
  department?: string;
  employeeId?: string;
  storeId?: string;
  isActive: boolean;
}

export interface Shipment {
  id: string;
  orderId: string;
  trackingNumber: string;
  carrier: CarrierType;
  carrierName: string;
  status: ShipmentStatus;
  shippingLabelUrl?: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in';
  };
  shippingCost?: number;
  fulfillmentCenterId?: string;
  shippingMethod?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export type ShipmentStatus =
  | 'pending'
  | 'label_created'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'exception'
  | 'returned'
  | 'cancelled';

export type CarrierType = 'usps' | 'ups' | 'fedex' | 'dhl' | 'other';

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stockQuantity: number;
  barcode?: string;
  sku?: string;
  imageUrl?: string;
  storeId: string;
  category?: string;
  isActive: boolean;
}

export interface Order {
  id: string;
  userId: string;
  storeId: string;
  storeName: string;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItem[];
  orderDate: string;
  shippingAddress?: ShippingAddress;
}

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  barcode?: string;
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface StockOperation {
  id?: string;
  productId: string;
  orderId?: string;
  type: 'in' | 'out';
  quantity: number;
  reason?: string;
  notes?: string;
  performedBy: string;
  performedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface BarcodeScanResult {
  type: 'product' | 'order' | 'tracking' | 'unknown';
  value: string;
  data?: any;
}

