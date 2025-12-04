// Return API - Used by Orders page
import { api } from './client';
import type { ApiResponse } from './types';

export interface OrderReturn {
  id: string;
  orderId: string;
  orderItemId: string;
  userId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'received' | 'refunded';
  refundAmount?: number;
  returnTrackingNumber?: string;
  requestedAt: string;
  processedAt?: string;
}

export interface CreateReturnRequest {
  orderId: string;
  orderItemId: string;
  reason: string;
}

export interface UpdateReturnStatusRequest {
  status: 'pending' | 'approved' | 'rejected' | 'received' | 'refunded';
  refundAmount?: number;
  returnTrackingNumber?: string;
}

export const returnApi = {
  // Get all returns for an order
  getOrderReturns: async (orderId: string): Promise<ApiResponse<OrderReturn[]>> => {
    const response = await api.get(`/api/returns/order/${orderId}`, {
      withCredentials: true,
    });
    return response.data;
  },

  // Create a return request
  createReturn: async (
    data: CreateReturnRequest
  ): Promise<ApiResponse<OrderReturn>> => {
    const response = await api.post(`/api/returns`, data, {
      withCredentials: true,
    });
    return response.data;
  },

  // Update return status
  updateReturnStatus: async (
    returnId: string,
    data: UpdateReturnStatusRequest
  ): Promise<ApiResponse<OrderReturn>> => {
    const response = await api.put(`/api/returns/${returnId}/status`, data, {
      withCredentials: true,
    });
    return response.data;
  },

  // Get return by ID
  getReturnById: async (returnId: string): Promise<ApiResponse<OrderReturn>> => {
    const response = await api.get(`/api/returns/${returnId}`, {
      withCredentials: true,
    });
    return response.data;
  },
};

