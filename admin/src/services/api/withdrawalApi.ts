import apiClient from './client';

export interface Withdrawal {
  id: string;
  storeId: string;
  storeName?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected' | 'cancelled';
  bankAccountName: string;
  bankAccountNumber: string;
  bankRoutingNumber: string;
  bankName: string;
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  processedBy?: string;
  processedAt?: string;
  rejectionReason?: string;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface StoreBalance {
  storeId: string;
  storeName: string;
  totalEarnings: number;
  totalWithdrawn: number;
  pendingWithdrawals: number;
  availableBalance: number;
  platformCommission: number;
  currency: string;
}

export interface CreateWithdrawalRequest {
  storeId: string;
  amount: number;
  currency?: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankRoutingNumber: string;
  bankName: string;
  notes?: string;
}

export const withdrawalApi = {
  // Admin endpoints
  getAllWithdrawals: async (params?: {
    status?: string;
    storeId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Withdrawal[]> => {
    try {
      const response = await apiClient.get('/api/admin/withdrawals', { params });
      
      // Log full response structure
      console.log('=== getAllWithdrawals Debug ===');
      console.log('Full response object:', response);
      console.log('response.data:', response.data);
      console.log('response.data type:', typeof response.data);
      console.log('response.data keys:', response.data ? Object.keys(response.data) : 'N/A');
      console.log('response.data.success:', response.data?.success);
      console.log('response.data.data:', response.data?.data);
      console.log('response.data.data type:', typeof response.data?.data);
      console.log('response.data.data isArray:', Array.isArray(response.data?.data));
      console.log('response.data.data length:', Array.isArray(response.data?.data) ? response.data.data.length : 'N/A');
      
      // Backend returns { success: true, data: [...] }
      let data = response.data?.data;
      
      // If data is not an array, try response.data directly
      if (!Array.isArray(data)) {
        console.log('⚠️ response.data.data is not an array');
        console.log('Trying response.data directly...');
        if (Array.isArray(response.data)) {
          data = response.data;
          console.log('✅ response.data is an array, using it');
        } else {
          console.log('❌ response.data is also not an array, returning empty array');
          data = [];
        }
      } else {
        console.log('✅ response.data.data is an array');
      }
      
      console.log('Final parsed data:', data);
      console.log('Final data length:', data.length);
      if (data.length > 0) {
        console.log('First withdrawal:', data[0]);
      }
      console.log('=== End getAllWithdrawals Debug ===');
      
      return data;
    } catch (error) {
      console.error('Error in getAllWithdrawals:', error);
      throw error;
    }
  },

  getWithdrawalById: async (id: string): Promise<Withdrawal> => {
    const response = await apiClient.get(`/api/admin/withdrawals/${id}`);
    return response.data.data;
  },

  getStoreBalance: async (storeId: string): Promise<StoreBalance> => {
    const response = await apiClient.get(`/api/admin/withdrawals/balance/${storeId}`);
    return response.data.data;
  },

  approveWithdrawal: async (id: string): Promise<Withdrawal> => {
    const response = await apiClient.post(`/api/admin/withdrawals/${id}/approve`);
    return response.data.data;
  },

  rejectWithdrawal: async (id: string, rejectionReason?: string): Promise<Withdrawal> => {
    const response = await apiClient.post(`/api/admin/withdrawals/${id}/reject`, {
      rejectionReason,
    });
    return response.data.data;
  },

  completeWithdrawal: async (id: string, notes?: string): Promise<Withdrawal> => {
    const response = await apiClient.post(`/api/admin/withdrawals/${id}/complete`, {
      notes,
    });
    return response.data.data;
  },

  // Store owner endpoints
  getStoreWithdrawals: async (storeId: string): Promise<Withdrawal[]> => {
    const response = await apiClient.get(`/api/stores/${storeId}/withdrawals`);
    console.log('getStoreWithdrawals full response:', response);
    console.log('getStoreWithdrawals response.data:', response.data);
    console.log('getStoreWithdrawals response.data.data:', response.data?.data);
    
    // Backend returns { success: true, data: [...] }
    let data = response.data?.data;
    
    // If data is not an array, try response.data directly
    if (!Array.isArray(data)) {
      console.log('response.data.data is not an array, trying response.data');
      data = Array.isArray(response.data) ? response.data : [];
    }
    
    console.log('getStoreWithdrawals final parsed data:', data);
    console.log('getStoreWithdrawals final data length:', data.length);
    return data;
  },

  getStoreBalanceForOwner: async (storeId: string): Promise<StoreBalance> => {
    const response = await apiClient.get(`/api/stores/${storeId}/withdrawals/balance`);
    return response.data.data;
  },

  createWithdrawal: async (storeId: string, data: CreateWithdrawalRequest): Promise<Withdrawal> => {
    const response = await apiClient.post(`/api/stores/${storeId}/withdrawals`, data);
    return response.data.data;
  },
};

