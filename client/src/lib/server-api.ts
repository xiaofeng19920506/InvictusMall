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
  membership?: {
    type: 'basic' | 'premium' | 'platinum';
    benefits: string[];
    discountPercentage: number;
    prioritySupport: boolean;
  };
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
    category: serverStore.category[0] || 'Other',
    rating: serverStore.rating,
    reviewCount: serverStore.reviewCount,
    imageUrl: serverStore.imageUrl,
    isVerified: serverStore.isVerified,
    location: serverStore.location.length > 0 
      ? `${serverStore.location[0].city}, ${serverStore.location[0].stateProvince}`
      : 'Unknown Location',
    productsCount: serverStore.productsCount,
    establishedYear: serverStore.establishedYear,
    discount: serverStore.discount,
    featured: serverStore.membership?.type === 'premium' || serverStore.membership?.type === 'platinum'
  };
}

function transformStores(serverStores: ServerStore[]): Store[] {
  return serverStores.map(store => transformStore(store));
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
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  
  const queryParams = new URLSearchParams();
  
  if (params?.category && params.category !== 'All') {
    queryParams.append('category', params.category);
  }
  
  if (params?.search) {
    queryParams.append('search', params.search);
  }
  
  if (params?.searchType && params.searchType !== 'All') {
    queryParams.append('searchType', params.searchType);
  }

  const url = `${baseUrl}/api/stores${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
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
      data: transformStores(data.data)
    };
  } catch (error) {
    console.error('Error fetching stores on server:', error);
    throw error;
  }
}

/**
 * Server-side function to fetch a single store by ID
 */
export async function fetchStoreByIdServer(id: string): Promise<ApiResponse<Store>> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const url = `${baseUrl}/api/stores/${id}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 15 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch store: ${response.statusText}`);
    }

    const data: ApiResponse<ServerStore> = await response.json();
    
    return {
      ...data,
      data: transformStore(data.data)
    };
  } catch (error) {
    console.error('Error fetching store on server:', error);
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
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
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
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const url = `${baseUrl}/api/orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Forward cookies for authentication
    // Express expects cookies in the format: "name=value; name2=value2"
    if (cookies && cookies.trim()) {
      headers['Cookie'] = cookies;
    }

    const response = await fetch(url, {
      headers,
      next: { revalidate: 0 }, // Don't cache authenticated requests
      // Don't cache authenticated requests
      cache: 'no-store',
    });

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = `Failed to fetch orders: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // If response is not JSON, use status text
      }
      
      // Handle authentication errors gracefully
      if (response.status === 401) {
        throw new Error('Authentication required. Please log in to view orders.');
      }
      
      throw new Error(errorMessage);
    }

    const data: ApiResponse<Order[]> = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching orders on server:', error);
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
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const url = `${baseUrl}/api/orders/${id}`;
  
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Forward cookies for authentication
    if (cookies) {
      headers['Cookie'] = cookies;
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
        throw new Error('Authentication required. Please log in to view order details.');
      }
      
      throw new Error(errorMessage);
    }

    const data: ApiResponse<Order> = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching order on server:', error);
    throw error;
  }
}

// Re-export User type from models for consistency
export type { User } from "@/models/User";

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
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const url = `${baseUrl}/api/auth/me`;
  
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Forward cookies for authentication
    if (cookies && cookies.trim()) {
      headers['Cookie'] = cookies;
    }

    const response = await fetch(url, {
      headers,
      next: { revalidate: 0 }, // Don't cache authenticated requests
      cache: 'no-store',
    });

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = `Failed to fetch user: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // If response is not JSON, use status text
      }
      
      // Handle authentication errors gracefully
      if (response.status === 401) {
        throw new Error('Authentication required. Please log in to view profile.');
      }
      
      throw new Error(errorMessage);
    }

    const data: AuthResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user on server:', error);
    throw error;
  }
}

