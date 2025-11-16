import axios from "axios";

// API base URL - pointing to your backend server
// Use VITE_API_URL environment variable or default to localhost:3001
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Always include credentials (cookies) for authentication
});

// Request interceptor - Add Bearer token from localStorage if available
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage (fallback when cookies don't work)
    const token = localStorage.getItem('staff_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
} from "../shared/types/store";

// Store API functions
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

    try {
      const response = await fetch(`${API_BASE_URL}/api/stores/upload-image`, {
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

// Staff API functions
export interface UpdateStaffRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role?: 'admin' | 'owner' | 'manager' | 'employee';
  department?: string;
  employeeId?: string;
  isActive?: boolean;
}

export interface Staff {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: 'admin' | 'owner' | 'manager' | 'employee';
  department?: string;
  employeeId?: string;
  storeId?: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  canEdit?: boolean;
}

export const staffApi = {
  // Get all staff
  getAllStaff: async (params?: {
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Staff[]>> => {
    const response = await api.get("/api/staff/all", {
      params,
      withCredentials: true,
    });
    return response.data;
  },

  // Update staff member
  updateStaff: async (
    id: string,
    updateData: UpdateStaffRequest
  ): Promise<ApiResponse<Staff>> => {
    const response = await api.put(`/api/staff/${id}`, updateData, {
      withCredentials: true,
    });
    return response.data;
  },
};

// Transaction API functions
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
  transactionDate: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Product API functions
export interface Product {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  stockQuantity: number;
  category?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  storeId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  stockQuantity?: number;
  category?: string;
  isActive?: boolean;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  stockQuantity?: number;
  category?: string;
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

  // Upload product image
  uploadProductImage: async (
    file: File,
    productId?: string
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
};

// Health check
// Category types
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

// Category API functions
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

// Order interfaces
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  price: number;
  subtotal: number;
  reservationDate?: string;
  reservationTime?: string;
  reservationNotes?: string;
  isReservation?: boolean;
}

export type OrderStatus =
  | "pending_payment"
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface Order {
  id: string;
  userId: string;
  storeId: string;
  storeName: string;
  items: OrderItem[];
  totalAmount: number;
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

// Order API functions
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

  // Update order status (admin only)
  updateOrderStatus: async (
    orderId: string,
    data: UpdateOrderStatusRequest
  ): Promise<ApiResponse<Order>> => {
    const response = await api.put(`/api/admin/orders/${orderId}/status`, data);
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
} from "../shared/types/store";

export default api;
