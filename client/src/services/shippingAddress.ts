// Shipping Address API service for client
export interface ShippingAddress {
  id: string;
  userId: string;
  label?: string;
  fullName: string;
  phoneNumber: string;
  streetAddress: string;
  aptNumber?: string;
  city: string;
  stateProvince: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShippingAddressRequest {
  label?: string;
  fullName: string;
  phoneNumber: string;
  streetAddress: string;
  aptNumber?: string;
  city: string;
  stateProvince: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
}

export interface UpdateShippingAddressRequest {
  label?: string;
  fullName?: string;
  phoneNumber?: string;
  streetAddress?: string;
  aptNumber?: string;
  city?: string;
  stateProvince?: string;
  zipCode?: string;
  country?: string;
  isDefault?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  error?: string;
}

class ShippingAddressService {
  private baseUrl: string;

  constructor() {
    let url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    // Normalize URL to ensure it has a protocol
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
      url = `http://${url}`;
    }
    this.baseUrl = url;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include", // Include cookies in requests
      ...options,
    };

    try {
      const response = await fetch(url, config);

      // Check content type to ensure we're getting JSON
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

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        // For 401 errors, throw a special error that can be handled gracefully
        if (response.status === 401) {
          const authError = new Error(
            errorData.message || "Unauthorized"
          ) as any;
          authError.status = 401;
          authError.isAuthError = true;
          throw authError;
        }
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const data: T = await response.json();
      return data;
    } catch (error) {
      // Only log non-authentication errors (401 is expected when not logged in)
      if (!(error as any)?.isAuthError) {
        console.error("Shipping Address API request failed:", {
          url,
          baseUrl: this.baseUrl,
          error,
        });
      }
      throw error;
    }
  }

  /**
   * Get all shipping addresses for the authenticated user
   * Returns array with default address first
   */
  async getAddresses(): Promise<ApiResponse<ShippingAddress[]>> {
    return this.request<ApiResponse<ShippingAddress[]>>(
      "/api/shipping-addresses"
    );
  }

  /**
   * Get default shipping address
   */
  async getDefaultAddress(): Promise<ApiResponse<ShippingAddress>> {
    return this.request<ApiResponse<ShippingAddress>>(
      "/api/shipping-addresses/default"
    );
  }

  /**
   * Get a specific shipping address by ID
   */
  async getAddressById(id: string): Promise<ApiResponse<ShippingAddress>> {
    return this.request<ApiResponse<ShippingAddress>>(
      `/api/shipping-addresses/${id}`
    );
  }

  /**
   * Create a new shipping address
   * Returns updated array with default address first
   */
  async createAddress(
    addressData: CreateShippingAddressRequest
  ): Promise<ApiResponse<ShippingAddress[]>> {
    return this.request<ApiResponse<ShippingAddress[]>>(
      "/api/shipping-addresses",
      {
        method: "POST",
        body: JSON.stringify(addressData),
      }
    );
  }

  /**
   * Update a shipping address
   * Returns updated array with default address first
   */
  async updateAddress(
    id: string,
    addressData: UpdateShippingAddressRequest
  ): Promise<ApiResponse<ShippingAddress[]>> {
    return this.request<ApiResponse<ShippingAddress[]>>(
      `/api/shipping-addresses/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(addressData),
      }
    );
  }

  /**
   * Set an address as default
   * Returns updated array with default address first
   */
  async setDefaultAddress(id: string): Promise<ApiResponse<ShippingAddress[]>> {
    return this.request<ApiResponse<ShippingAddress[]>>(
      `/api/shipping-addresses/${id}/set-default`,
      {
        method: "POST",
      }
    );
  }

  /**
   * Delete a shipping address
   * Returns updated array with default address first
   */
  async deleteAddress(id: string): Promise<ApiResponse<ShippingAddress[]>> {
    return this.request<ApiResponse<ShippingAddress[]>>(
      `/api/shipping-addresses/${id}`,
      {
        method: "DELETE",
      }
    );
  }
}

// Export a singleton instance
export const shippingAddressService = new ShippingAddressService();
export default shippingAddressService;

