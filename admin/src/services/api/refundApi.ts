// Refund API - Used by Orders page
import { api } from './client';
import type { ApiResponse } from './types';

export const refundApi = {
  // Create a refund for an order
  createRefund: async (
    orderId: string,
    data: { amount?: number; reason?: string }
  ): Promise<ApiResponse<{
    refund: {
      id: string;
      refundId: string;
      amount: number;
      status: string;
      reason?: string;
      createdAt: string;
    };
    remainingAmount: number;
  }>> => {
    const response = await api.post(`/api/refunds/${orderId}`, data, {
      withCredentials: true,
    });
    return response.data;
  },

  // Get refunds for an order
  getOrderRefunds: async (orderId: string): Promise<ApiResponse<{
    refunds: Array<{
      id: string;
      orderId: string;
      paymentIntentId: string;
      refundId: string;
      amount: number;
      currency: string;
      reason?: string;
      status: string;
      refundedBy?: string;
      itemIds?: string[];
      createdAt: string;
      updatedAt: string;
    }>;
    totalRefunded: number;
  }>> => {
    const response = await api.get(`/api/refunds/order/${orderId}`, {
      withCredentials: true,
    });
    return response.data;
  },
};

