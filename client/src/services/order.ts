// Order API service for client
export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  userId: string;
  storeId: string;
  storeName: string;
  items: OrderItem[];
  totalAmount: number;
  status:
    | "pending_payment"
    | "pending"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";
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
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
}

export interface ApiError {
  success: false;
  message: string;
  error?: string;
}

import { authService } from './auth';

class OrderService {
  private baseUrl: string;

  constructor() {
    let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    // Normalize URL to ensure it has a protocol
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }
    this.baseUrl = url;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retried = false
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include",
      ...options,
    };

    try {
      let response = await fetch(url, config);
      let attemptedRefresh = false;

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response received:", {
          url,
          status: response.status,
          contentType,
          preview: text.substring(0, 200),
        });
        throw new Error(
          `Expected JSON but received ${contentType}. Check if the API URL is correct: ${this.baseUrl}`
        );
      }

      if (!response.ok && response.status === 401 && !attemptedRefresh) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          attemptedRefresh = true;
          response = await fetch(url, config);
          const refreshedContentType = response.headers.get("content-type");
          if (
            !refreshedContentType ||
            !refreshedContentType.includes("application/json")
          ) {
            const text = await response.text();
            console.error("Non-JSON response received after refresh:", {
              url,
              status: response.status,
              contentType: refreshedContentType,
              preview: text.substring(0, 200),
            });
            throw new Error(
              `Expected JSON but received ${refreshedContentType}. Check if the API URL is correct: ${this.baseUrl}`
            );
          }
        } else {
          attemptedRefresh = true;
        }
      }

      if (!response.ok) {
        let errorData: ApiError | undefined;
        try {
          errorData = await response.json();
        } catch {
          // ignore parsing error
        }
        throw new Error(
          errorData?.message || `HTTP error! status: ${response.status}`
        );
      }

      const data: T = await response.json();
      return data;
    } catch (error) {
      console.error("Order API request failed:", {
        url,
        baseUrl: this.baseUrl,
        error,
      });
      throw error;
    }
  }

  private async tryRefreshToken(): Promise<boolean> {
    try {
      const result = await authService.refreshToken();
      return Boolean(result?.success);
    } catch (error) {
      console.warn("Token refresh attempt failed:", error);
      return false;
    }
  }

  async getOrders(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Order[]>> {
    const queryParams = new URLSearchParams();
    
    if (params?.status) {
      queryParams.append('status', params.status);
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params?.offset) {
      queryParams.append('offset', params.offset.toString());
    }

    const endpoint = `/api/orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<ApiResponse<Order[]>>(endpoint);
  }

  async getOrderById(id: string): Promise<ApiResponse<Order>> {
    return this.request<ApiResponse<Order>>(`/api/orders/${id}`);
  }

  async getOrderHistory(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Order[]>> {
    return this.getOrders(params);
  }
}

// Export a singleton instance
export const orderService = new OrderService();
export default orderService;

