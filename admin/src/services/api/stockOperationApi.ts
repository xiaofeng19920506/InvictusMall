import { api } from './client';
import type { ApiResponse } from './types';

export interface StockOperation {
  id: string;
  productId: string;
  type: 'in' | 'out';
  quantity: number;
  reason?: string;
  performedBy: string;
  performedAt: string;
  createdAt: string;
  orderId?: string;
  previousQuantity: number;
  newQuantity: number;
  product?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
}

export interface CreateStockOperationRequest {
  productId: string;
  type: 'in' | 'out';
  quantity: number;
  reason?: string;
  orderId?: string;
}

export const stockOperationApi = {
  // Create stock operation
  createStockOperation: async (
    data: CreateStockOperationRequest
  ): Promise<ApiResponse<{
    operation: StockOperation;
    orderUpdated?: boolean;
    orderStatus?: string;
  }>> => {
    const response = await api.post("/api/stock-operations", data, {
      withCredentials: true,
    });
    return response.data;
  },

  // Get all stock operations with filters
  getStockOperations: async (params?: {
    productId?: string;
    type?: 'in' | 'out';
    performedBy?: string;
    orderId?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{
    operations: StockOperation[];
    total: number;
  }>> => {
    const response = await api.get("/api/stock-operations", {
      params,
      withCredentials: true,
    });
    return response.data;
  },

  // Get stock operation by ID
  getStockOperationById: async (
    id: string
  ): Promise<ApiResponse<StockOperation>> => {
    const response = await api.get(`/api/stock-operations/${id}`, {
      withCredentials: true,
    });
    return response.data;
  },

  // Get stock operations for a product
  getStockOperationsByProductId: async (
    productId: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<ApiResponse<{
    operations: StockOperation[];
    total: number;
  }>> => {
    const response = await api.get(`/api/stock-operations/product/${productId}`, {
      params,
      withCredentials: true,
    });
    return response.data;
  },
};

