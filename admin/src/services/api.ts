import axios from "axios";

// API base URL - pointing to your backend server
const API_BASE_URL = "http://localhost:3001";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

import type {
  Store,
  CreateStoreRequest,
  UpdateStoreRequest,
  ApiResponse,
  ActivityLog,
} from "../types/store";

// Store API functions
export const storeApi = {
  // Get all stores
  getAllStores: async (params?: {
    category?: string;
    search?: string;
  }): Promise<ApiResponse<Store[]>> => {
    const response = await api.get("/api/stores", { params });
    return response.data;
  },

  // Get store by ID
  getStoreById: async (id: string): Promise<ApiResponse<Store>> => {
    const response = await api.get(`/api/stores/${id}`);
    return response.data;
  },

  // Create new store
  createStore: async (
    storeData: CreateStoreRequest
  ): Promise<ApiResponse<Store>> => {
    const response = await api.post("/api/stores", storeData);
    return response.data;
  },

  // Update store
  updateStore: async (
    id: string,
    storeData: UpdateStoreRequest
  ): Promise<ApiResponse<Store>> => {
    const response = await api.put(`/api/stores/${id}`, storeData);
    return response.data;
  },

  // Delete store
  deleteStore: async (id: string): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/api/stores/${id}`);
    return response.data;
  },

  // Get stores by category
  getStoresByCategory: async (
    category: string
  ): Promise<ApiResponse<Store[]>> => {
    const response = await api.get(
      `/api/stores?category=${encodeURIComponent(category)}`
    );
    return response.data;
  },

  // Search stores
  searchStores: async (query: string): Promise<ApiResponse<Store[]>> => {
    const response = await api.get(
      `/api/stores?search=${encodeURIComponent(query)}`
    );
    return response.data;
  },

  // Get all categories
  getCategories: async (): Promise<ApiResponse<string[]>> => {
    const response = await api.get("/api/stores/categories");
    return response.data;
  },

  // Get membership stores
  getMembershipStores: async (): Promise<ApiResponse<Store[]>> => {
    const response = await api.get("/api/stores/membership");
    return response.data;
  },

  // Get premium stores
  getPremiumStores: async (): Promise<ApiResponse<Store[]>> => {
    const response = await api.get("/api/stores/premium");
    return response.data;
  },

  // Verify store (admin only)
  verifyStore: async (id: string): Promise<ApiResponse<Store>> => {
    const response = await api.put(`/api/stores/${id}/verify`);
    return response.data;
  },

  // Upload store image
  uploadStoreImage: async (
    file: File
  ): Promise<ApiResponse<{ imageUrl: string }>> => {
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/stores/upload-image`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      if (!response.ok) {
        let errorMessage = `Failed to upload image (status ${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // ignore parse errors, use default message
        }
        throw new Error(errorMessage);
      }

      const data = (await response.json()) as ApiResponse<{ imageUrl: string }>;
      return data;
    } catch (error) {
      console.error("Store image upload failed:", error);
      throw error;
    }
  },
};

// Activity Logs API functions
export const activityLogApi = {
  // Get recent activity logs
  getRecentLogs: async (
    limit?: number
  ): Promise<ApiResponse<ActivityLog[]>> => {
    const response = await api.get("/api/activity-logs", {
      params: { limit: limit || 20 },
    });
    return response.data;
  },

  // Get activity logs by store ID
  getLogsByStoreId: async (
    storeId: string,
    limit?: number
  ): Promise<ApiResponse<ActivityLog[]>> => {
    const response = await api.get(`/api/activity-logs/store/${storeId}`, {
      params: { limit: limit || 10 },
    });
    return response.data;
  },

  // Get activity logs by type
  getLogsByType: async (
    type: ActivityLog["type"],
    limit?: number
  ): Promise<ApiResponse<ActivityLog[]>> => {
    const response = await api.get(`/api/activity-logs/type/${type}`, {
      params: { limit: limit || 10 },
    });
    return response.data;
  },
};

// Health check
export const healthApi = {
  checkHealth: async (): Promise<{
    success: boolean;
    message: string;
    timestamp: string;
    uptime: number;
  }> => {
    const response = await api.get("/health");
    return response.data;
  },
};

// Re-export types for convenience
export type {
  Store,
  Location,
  CreateStoreRequest,
  UpdateStoreRequest,
  ApiResponse,
} from "../types/store";

export default api;
