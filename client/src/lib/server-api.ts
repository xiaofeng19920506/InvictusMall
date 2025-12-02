// Server-side API utility for fetching stores
// This runs on the server and can access the backend API directly

import type { Store } from "@/services/api";

interface ServerStore {
  id: string;
  name: string;
  description: string;
  category: string[];
  rating: number;
  reviewCount: number;
  imageUrl: string;
  isVerified: boolean;
  isActive: boolean;
  location: Array<{
    streetAddress: string;
    aptNumber?: string;
    city: string;
    stateProvince: string;
    zipCode: string;
    country: string;
  }>;
  productsCount: number;
  establishedYear: number;
  discount?: string;
  createdAt: string;
  updatedAt: string;
}

// Re-export Store type for convenience
export type { Store };

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
}

// Transform server store data to client format
function transformStore(serverStore: ServerStore): Store {
  return {
    id: serverStore.id,
    name: serverStore.name,
    description: serverStore.description,
    category: serverStore.category[0] || "Other",
    rating: serverStore.rating,
    reviewCount: serverStore.reviewCount,
    imageUrl: serverStore.imageUrl,
    isVerified: serverStore.isVerified,
    isActive: serverStore.isActive,
    location:
      serverStore.location.length > 0
        ? `${serverStore.location[0].city}, ${serverStore.location[0].stateProvince}`
        : "Unknown Location",
    productsCount: serverStore.productsCount,
    establishedYear: serverStore.establishedYear,
    discount: serverStore.discount,
  };
}

function transformStores(serverStores: ServerStore[]): Store[] {
  return serverStores.map((store) => transformStore(store));
}

/**
 * Server-side function to fetch stores from the API
 * This runs on the server, so it can directly access the backend
 */
export async function fetchStoresServer(params?: {
  category?: string;
  search?: string;
  searchType?: string;
}): Promise<ApiResponse<Store[]>> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const queryParams = new URLSearchParams();

  if (params?.category && params.category !== "All") {
    queryParams.append("category", params.category);
  }

  if (params?.search) {
    queryParams.append("search", params.search);
  }

  if (params?.searchType && params.searchType !== "All") {
    queryParams.append("searchType", params.searchType);
  }

  const url = `${baseUrl}/api/stores${
    queryParams.toString() ? `?${queryParams.toString()}` : ""
  }`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
      // On the server, we can cache the response for better performance
      next: { revalidate: 15 }, // Revalidate every 15 seconds
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch stores: ${response.statusText}`);
    }

    const data: ApiResponse<ServerStore[]> = await response.json();

    return {
      ...data,
      data: transformStores(data.data),
    };
  } catch (error) {
    console.error("Error fetching stores on server:", error);
    throw error;
  }
}

/**
 * Server-side function to fetch a single store by ID
 */
export async function fetchStoreByIdServer(
  id: string
): Promise<ApiResponse<Store>> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const url = `${baseUrl}/api/stores/${id}`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 15 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch store: ${response.statusText}`);
    }

    const data: ApiResponse<ServerStore> = await response.json();

    return {
      ...data,
      data: transformStore(data.data),
    };
  } catch (error) {
    console.error("Error fetching store on server:", error);
    throw error;
  }
}

// Order types
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

/**
 * Server-side function to fetch orders
 * Cookies are automatically forwarded from the request
 */
export async function fetchOrdersServer(
  cookies: string | undefined,
  params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<ApiResponse<Order[]>> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append("status", params.status);
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  if (params?.offset) queryParams.append("offset", params.offset.toString());

  const url = `${baseUrl}/api/orders${
    queryParams.toString() ? `?${queryParams.toString()}` : ""
  }`;

  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Forward cookies for authentication
    // Express expects cookies in the format: "name=value; name2=value2"
    if (cookies && cookies.trim()) {
      headers["Cookie"] = cookies;
    }

    const response = await fetch(url, {
      headers,
      cache: "no-store", // Don't cache authenticated requests
    });

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = `Failed to fetch orders: ${response.statusText}`;
      try {
        const errorData = (await response.json()) as
          | { message?: string }
          | undefined;
        if (errorData?.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // If response is not JSON, use status text
      }

      // Handle authentication errors gracefully
      if (response.status === 401) {
        return {
          success: false,
          data: [],
          message: "Authentication required. Please log in to view orders.",
        };
      }

      return {
        success: false,
        data: [],
        message: errorMessage,
      };
    }

    const data: ApiResponse<Order[]> = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching orders on server:", {
      error,
      url,
      params,
      hasCookies: Boolean(cookies && cookies.trim()),
    });
    throw error;
  }
}

/**
 * Server-side function to fetch a single order by ID
 */
export async function fetchOrderByIdServer(
  id: string,
  cookies: string | undefined
): Promise<ApiResponse<Order>> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const url = `${baseUrl}/api/orders/${id}`;

  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Forward cookies for authentication
    if (cookies) {
      headers["Cookie"] = cookies;
    }

    const response = await fetch(url, {
      headers,
      next: { revalidate: 0 }, // Don't cache authenticated requests
    });

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = `Failed to fetch order: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // If response is not JSON, use status text
      }

      // Handle authentication errors gracefully
      if (response.status === 401) {
        throw new Error(
          "Authentication required. Please log in to view order details."
        );
      }

      throw new Error(errorMessage);
    }

    const data: ApiResponse<Order> = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching order on server:", error);
    throw error;
  }
}

// Re-export User type from models for consistency
export type { User } from "@/models/User";

// Shipping Address types
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

export interface CheckoutCompletionResponse {
  success: boolean;
  message?: string;
  orderIds?: string[];
}

export async function completeCheckoutSessionServer(
  cookiesHeader: string | undefined,
  sessionId: string,
  isGuest: boolean = false
): Promise<CheckoutCompletionResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const url = isGuest 
    ? `${baseUrl}/api/payments/guest-checkout-complete`
    : `${baseUrl}/api/payments/checkout-complete`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (cookiesHeader && cookiesHeader.trim() && !isGuest) {
    headers["Cookie"] = cookiesHeader;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ sessionId }),
    cache: "no-store",
  });

  const data = (await response.json()) as CheckoutCompletionResponse & {
    success?: boolean;
    message?: string;
    orderIds?: string[];
  };

  if (!response.ok) {
    return {
      success: false,
      message:
        data?.message ||
        `Failed to complete checkout session. Status code: ${response.status}`,
    };
  }

  return {
    success: Boolean(data?.success),
    message: data?.message,
    orderIds: Array.isArray(data?.orderIds) ? data.orderIds : undefined,
  };
}

/**
 * Server-side function to fetch shipping addresses
 * Uses cookies for authentication
 */
export async function fetchShippingAddressesServer(
  cookies: string | undefined
): Promise<ApiResponse<ShippingAddress[]>> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const url = `${baseUrl}/api/shipping-addresses`;

  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Forward cookies for authentication
    if (cookies && cookies.trim()) {
      headers["Cookie"] = cookies;
    }

    const response = await fetch(url, {
      headers,
      cache: "no-store", // Don't cache authenticated requests
    });

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = `Failed to fetch shipping addresses: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // If response is not JSON, use status text
      }

      // Handle authentication errors gracefully
      if (response.status === 401) {
        throw new Error(
          "Authentication required. Please log in to view addresses."
        );
      }

      throw new Error(errorMessage);
    }

    const data: ApiResponse<ShippingAddress[]> = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching shipping addresses on server:", error);
    throw error;
  }
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: import("@/models/User").User;
  token?: string;
}

/**
 * Server-side function to fetch current user details
 * Uses cookies for authentication
 */
export async function fetchUserServer(
  cookies: string | undefined
): Promise<AuthResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const url = `${baseUrl}/api/auth/me`;

  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Forward cookies for authentication
    if (cookies && cookies.trim()) {
      headers["Cookie"] = cookies;
    }

    const response = await fetch(url, {
      headers,
      cache: "no-store", // Don't cache authenticated requests
    });

    if (!response.ok) {
      // Handle authentication errors gracefully
      if (response.status === 401) {
        return {
          success: false,
          message: "Authentication required. Please log in to view profile.",
        };
      }

      // Try to get error message from response
      let errorMessage = `Failed to fetch user: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // If response is not JSON, use status text
      }

      throw new Error(errorMessage);
    }

    const data: AuthResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching user on server:", error);
    throw error;
  }
}

// Category type
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

/**
 * Server-side function to fetch level 1 categories for navigation
 * This runs on the server and can be cached for better performance
 */
export async function fetchCategoriesServer(): Promise<ApiResponse<Category[]>> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const url = `${baseUrl}/api/categories?level=1`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
      // Cache categories for 5 minutes since they don't change frequently
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }

    const data: ApiResponse<Category[]> = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching categories on server:", error);
    // Return empty array on error to prevent page crashes
    return {
      success: false,
      data: [],
      message: error instanceof Error ? error.message : "Failed to fetch categories",
    };
  }
}
