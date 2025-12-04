// Category API - Used by Categories management page
import { api } from './client';
import type { ApiResponse } from './types';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  level: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  children?: Category[];
}

export interface CategoryTree extends Category {
  children?: CategoryTree[];
}

export const categoryApi = {
  // Get all categories
  getAllCategories: async (params?: {
    includeInactive?: boolean;
    tree?: boolean;
    level?: number;
    parentId?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Category[] | CategoryTree[]>> => {
    const response = await api.get("/api/categories", { params });
    return response.data;
  },

  // Get category by ID
  getCategoryById: async (id: string): Promise<ApiResponse<Category>> => {
    const response = await api.get(`/api/categories/${id}`);
    return response.data;
  },

  // Create category
  createCategory: async (data: {
    name: string;
    slug?: string;
    description?: string;
    parentId?: string;
    displayOrder?: number;
    isActive?: boolean;
  }): Promise<ApiResponse<Category>> => {
    const response = await api.post("/api/categories", data);
    return response.data;
  },

  // Update category
  updateCategory: async (
    id: string,
    data: {
      name?: string;
      slug?: string;
      description?: string;
      parentId?: string;
      displayOrder?: number;
      isActive?: boolean;
    }
  ): Promise<ApiResponse<Category>> => {
    const response = await api.put(`/api/categories/${id}`, data);
    return response.data;
  },

  // Delete category
  deleteCategory: async (id: string): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/api/categories/${id}`);
    return response.data;
  },

  // Get categories as tree
  getCategoryTree: async (params?: {
    includeInactive?: boolean;
  }): Promise<ApiResponse<CategoryTree[]>> => {
    const response = await api.get("/api/categories", {
      params: { ...params, tree: true },
    });
    return response.data;
  },

  // Get top-level categories (level 1)
  getTopLevelCategories: async (): Promise<ApiResponse<Category[]>> => {
    const response = await api.get("/api/categories", {
      params: { level: 1 },
    });
    return response.data;
  },
};

