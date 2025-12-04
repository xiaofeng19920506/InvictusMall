// Transaction API - Used by Transactions page
import { api } from './client';
import type { ApiResponse } from './types';

export interface StoreTransaction {
  id: string;
  storeId: string;
  transactionType: 'sale' | 'refund' | 'payment' | 'fee' | 'commission';
  amount: number;
  currency: string;
  description?: string;
  customerId?: string;
  customerName?: string;
  orderId?: string;
  paymentMethod?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  transactionDate: string;
  createdBy?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionRequest {
  storeId: string;
  transactionType: 'sale' | 'refund' | 'payment' | 'fee' | 'commission';
  amount: number;
  currency?: string;
  description?: string;
  customerId?: string;
  customerName?: string;
  orderId?: string;
  paymentMethod?: string;
  status?: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  transactionDate?: string;
  metadata?: Record<string, any>;
}

export interface UpdateTransactionRequest {
  status?: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  description?: string;
  metadata?: Record<string, any>;
}

export interface TransactionFilters {
  storeId?: string;
  transactionType?: 'sale' | 'refund' | 'payment' | 'fee' | 'commission';
  status?: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  customerId?: string;
  orderId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface TransactionStats {
  totalSales: number;
  totalRefunds: number;
  totalTransactions: number;
  totalAmount: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface StripeTransaction {
  id: string;
  stripeType: 'charge' | 'balance_transaction' | 'payment_intent';
  storeId?: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description?: string;
  transactionType?: 'sale' | 'refund' | 'payment' | 'fee';
  customerId?: string;
  customerName?: string;
  paymentMethod?: string;
  paymentIntentId?: string;
  cardBrand?: string;
  cardLast4?: string;
  transactionDate: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export const transactionApi = {
  // Get all transactions with filters
  getTransactions: async (filters?: TransactionFilters): Promise<ApiResponse<StoreTransaction[]>> => {
    const response = await api.get("/api/transactions", {
      params: filters,
      withCredentials: true,
    });
    return response.data;
  },

  // Get transaction by ID
  getTransactionById: async (id: string): Promise<ApiResponse<StoreTransaction>> => {
    const response = await api.get(`/api/transactions/${id}`, {
      withCredentials: true,
    });
    return response.data;
  },

  // Get transactions for a specific store
  getStoreTransactions: async (storeId: string, limit?: number): Promise<ApiResponse<StoreTransaction[]>> => {
    const response = await api.get(`/api/transactions/store/${storeId}`, {
      params: { limit },
      withCredentials: true,
    });
    return response.data;
  },

  // Get transaction statistics for a store
  getStoreTransactionStats: async (
    storeId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<TransactionStats>> => {
    const response = await api.get(`/api/transactions/stats/${storeId}`, {
      params: { startDate, endDate },
      withCredentials: true,
    });
    return response.data;
  },

  // Create a new transaction
  createTransaction: async (data: CreateTransactionRequest): Promise<ApiResponse<StoreTransaction>> => {
    const response = await api.post("/api/transactions", data, {
      withCredentials: true,
    });
    return response.data;
  },

  // Update a transaction
  updateTransaction: async (
    id: string,
    updateData: UpdateTransactionRequest
  ): Promise<ApiResponse<StoreTransaction>> => {
    const response = await api.put(`/api/transactions/${id}`, updateData, {
      withCredentials: true,
    });
    return response.data;
  },

  // Get Stripe transactions
  getStripeTransactions: async (
    filters?: { limit?: number; type?: 'charge' | 'balance_transaction' | 'payment_intent'; starting_after?: string }
  ): Promise<ApiResponse<StripeTransaction[]>> => {
    const response = await api.get("/api/transactions/stripe/list", {
      params: filters,
      withCredentials: true,
    });
    return response.data;
  },
};

