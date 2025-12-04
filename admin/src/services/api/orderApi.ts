// Order API - Used by Orders management page
import { api } from './client';
import type { ApiResponse } from './types';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  price: number;
  subtotal: number;
  currency?: string;
  reservationDate?: string;
  reservationTime?: string;
  reservationNotes?: string;
  isReservation?: boolean;
}

export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "return_processing"
  | "returned";

export interface Order {
  paymentIntentId?: string | null;
  id: string;
  userId: string;
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
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  trackingNumber?: string;
}

export const orderApi = {
  // Get all orders (admin only)
  getAllOrders: async (params?: {
    status?: string;
    storeId?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Order[]>> => {
    const response = await api.get("/api/admin/orders", { params });
    return response.data;
  },

  // Get order by ID (admin only)
  getOrderById: async (orderId: string): Promise<ApiResponse<Order>> => {
    const response = await api.get(`/api/admin/orders/${orderId}`, {
      withCredentials: true,
    });
    return response.data;
  },

  // Update order status (admin only)
  updateOrderStatus: async (
    orderId: string,
    data: UpdateOrderStatusRequest
  ): Promise<ApiResponse<Order>> => {
    const response = await api.put(`/api/admin/orders/${orderId}/status`, data);
    return response.data;
  },
};

