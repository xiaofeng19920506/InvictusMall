// Product API - Used by Products and Inventory pages
import { api, API_BASE_URL } from './client';
import type { ApiResponse } from './types';

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string; // Deprecated: kept for backward compatibility
  imageUrls?: string[]; // Array of image URLs
  stockQuantity: number;
  category?: string;
  barcode?: string;
  serialNumber?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  storeId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string; // Deprecated: kept for backward compatibility
  imageUrls?: string[]; // Array of image URLs
  stockQuantity?: number;
  category?: string;
  barcode?: string;
  serialNumber?: string;
  isActive?: boolean;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  imageUrl?: string; // Deprecated: kept for backward compatibility
  imageUrls?: string[]; // Array of image URLs
  stockQuantity?: number;
  category?: string;
  barcode?: string;
  serialNumber?: string;
  isActive?: boolean;
}

export const productApi = {
  // Get all products for a store
  getProductsByStore: async (
    storeId: string,
    isActive?: boolean,
    limit?: number,
    offset?: number
  ): Promise<ApiResponse<Product[]>> => {
    const params: any = {};
    if (isActive !== undefined) {
      params.isActive = isActive;
    }
    if (limit !== undefined) {
      params.limit = limit;
    }
    if (offset !== undefined) {
      params.offset = offset;
    }
    const response = await api.get(`/api/products/store/${storeId}`, {
      params,
      withCredentials: true,
    });
    return response.data;
  },

  // Get product by ID
  getProductById: async (id: string): Promise<ApiResponse<Product>> => {
    const response = await api.get(`/api/products/${id}`, {
      withCredentials: true,
    });
    return response.data;
  },

  // Create new product
  createProduct: async (
    productData: CreateProductRequest
  ): Promise<ApiResponse<Product>> => {
    const response = await api.post("/api/products", productData, {
      withCredentials: true,
    });
    return response.data;
  },

  // Update product
  updateProduct: async (
    id: string,
    productData: UpdateProductRequest
  ): Promise<ApiResponse<Product>> => {
    const response = await api.put(`/api/products/${id}`, productData, {
      withCredentials: true,
    });
    return response.data;
  },

  // Delete product
  deleteProduct: async (id: string): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/api/products/${id}`, {
      withCredentials: true,
    });
    return response.data;
  },

  // Upload product image (single)
  uploadProductImage: async (
    file: File,
    productId?: string
  ): Promise<
    ApiResponse<{
      imageUrl: string;
      imageUrls?: string[];
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

    if (productId) {
      formData.append("productId", productId);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/products/upload-image`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

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
      console.error("Product image upload failed:", error);
      throw error;
    }
  },

  // Upload multiple product images
  uploadProductImages: async (
    files: File[],
    productId?: string
  ): Promise<
    ApiResponse<{
      imageUrls: string[];
    }>
  > => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file, file.name);
    });

    if (productId) {
      formData.append("productId", productId);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/products/upload-images`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = `Failed to upload images (status ${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // ignore parse errors, use default message
        }
        throw new Error(errorMessage);
      }

      const data = (await response.json()) as ApiResponse<{ imageUrls: string[] }>;
      return data;
    } catch (error) {
      console.error("Product images upload failed:", error);
      throw error;
    }
  },
};

