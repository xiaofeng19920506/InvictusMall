import { api, API_BASE_URL } from './client';
import type { ApiResponse } from './types';
import type {
  Store,
  CreateStoreRequest,
  UpdateStoreRequest,
} from '../../shared/types/store';

export const storeApi = {
  // Get all stores
  getAllStores: async (params?: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
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
    file: File,
    storeId?: string
  ): Promise<
    ApiResponse<{
      imageUrl: string;
      metadata?: { originalName: string; mimeType: string; size: number };
    }>
  > => {
    const formData = new FormData();
    formData.append("file", file, file.name);

    const metadata = {
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
    };

    formData.append("metadata", JSON.stringify(metadata));

    if (storeId) {
      formData.append("storeId", storeId);
    }

    const staffToken = localStorage.getItem("staff_auth_token");
    let userToken: string | undefined;
    try {
      const cookies = document.cookie.split("; ");
      const authTokenCookie = cookies.find((row) =>
        row.startsWith("auth_token=")
      );
      if (authTokenCookie) {
        userToken = authTokenCookie.split("=")[1];
      }
    } catch (e) {
      console.warn("Failed to read auth_token from cookies:", e);
    }

    const token = staffToken || userToken;
    const headers: HeadersInit = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const refreshToken = async (): Promise<boolean> => {
      try {
        const refreshResponse = await fetch(
          `${API_BASE_URL}/api/auth/refresh`,
          {
            method: "POST",
            credentials: "include",
          }
        );
        return refreshResponse.ok;
      } catch {
        return false;
      }
    };

    try {
      let response = await fetch(`${API_BASE_URL}/api/stores/upload-image`, {
        method: "POST",
        credentials: "include",
        headers,
        body: formData,
      });

      if (response.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) {
          const retryFormData = new FormData();
          retryFormData.append("file", file, file.name);
          retryFormData.append("metadata", JSON.stringify(metadata));
          if (storeId) {
            retryFormData.append("storeId", storeId);
          }
          response = await fetch(`${API_BASE_URL}/api/stores/upload-image`, {
            method: "POST",
            credentials: "include",
            body: retryFormData,
          });
        }
      }

      if (!response.ok) {
        let errorMessage = `Failed to upload image (status ${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // ignore parse errors
        }
        throw new Error(errorMessage);
      }

      return (await response.json()) as ApiResponse<{ imageUrl: string }>;
    } catch (error) {
      console.error("Store image upload failed:", error);
      throw error;
    }
  },
};

