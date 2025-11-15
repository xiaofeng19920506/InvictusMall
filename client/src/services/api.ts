// Server-side Store interface (what comes from API)
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

// Client-side Store interface (what the UI expects)
export interface Store {
  id: string;
  name: string;
  description: string;
  category: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  isVerified: boolean;
  isActive: boolean;
  location: string;
  productsCount: number;
  establishedYear: number;
  discount?: string;
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

class ApiService {
  private baseUrl: string;

  constructor() {
    // Use environment variable or default to localhost
    let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    // Normalize URL to ensure it has a protocol
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }
    this.baseUrl = url;
  }

  // Transform server store data to client format
  private transformStore(serverStore: ServerStore): Store {
    return {
      id: serverStore.id,
      name: serverStore.name,
      description: serverStore.description,
      category: serverStore.category[0] || 'Other', // Use first category
      rating: serverStore.rating,
      reviewCount: serverStore.reviewCount,
      imageUrl: serverStore.imageUrl,
      isVerified: serverStore.isVerified,
      isActive: serverStore.isActive,
      location: serverStore.location.length > 0
        ? `${serverStore.location[0].city}, ${serverStore.location[0].stateProvince}`
        : 'Unknown Location',
      productsCount: serverStore.productsCount,
      establishedYear: serverStore.establishedYear,
      discount: serverStore.discount,
    };
  }

  // Transform array of server stores to client format
  private transformStores(serverStores: ServerStore[]): Store[] {
    return serverStores.map(store => this.transformStore(store));
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      // Check content type to ensure we're getting JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response received:', {
          url,
          status: response.status,
          contentType,
          preview: text.substring(0, 200)
        });
        throw new Error(`Expected JSON but received ${contentType}. Check if the API URL is correct: ${this.baseUrl}`);
      }
      
      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data: T = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', {
        url,
        baseUrl: this.baseUrl,
        error
      });
      throw error;
    }
  }

  // Store-related API methods
  async getAllStores(params?: {
    category?: string;
    search?: string;
    searchType?: string;
  }): Promise<ApiResponse<Store[]>> {
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

    const endpoint = `/api/stores${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.request<ApiResponse<ServerStore[]>>(endpoint);
    
    return {
      ...response,
      data: this.transformStores(response.data)
    };
  }

  async getStoreById(id: string): Promise<ApiResponse<Store>> {
    const response = await this.request<ApiResponse<ServerStore>>(`/api/stores/${id}`);
    
    return {
      ...response,
      data: this.transformStore(response.data)
    };
  }


  async getStoresByCategory(category: string): Promise<ApiResponse<Store[]>> {
    const response = await this.request<ApiResponse<ServerStore[]>>(`/api/stores?category=${encodeURIComponent(category)}`);
    
    return {
      ...response,
      data: this.transformStores(response.data)
    };
  }

  async searchStores(query: string): Promise<ApiResponse<Store[]>> {
    const response = await this.request<ApiResponse<ServerStore[]>>(`/api/stores?search=${encodeURIComponent(query)}`);
    
    return {
      ...response,
      data: this.transformStores(response.data)
    };
  }

  // Health check
  async healthCheck(): Promise<{ success: boolean; message: string; timestamp: string; uptime: number }> {
    return this.request<{ success: boolean; message: string; timestamp: string; uptime: number }>('/health');
  }

  // Category-related API methods
  async getTopLevelCategories(): Promise<ApiResponse<Category[]>> {
    const endpoint = `/api/categories?level=1`;
    return await this.request<ApiResponse<Category[]>>(endpoint);
  }

  async getAllCategories(params?: {
    includeInactive?: boolean;
    tree?: boolean;
    level?: number;
    parentId?: string;
  }): Promise<ApiResponse<Category[]>> {
    const queryParams = new URLSearchParams();
    if (params?.includeInactive) {
      queryParams.append('includeInactive', 'true');
    }
    if (params?.tree) {
      queryParams.append('tree', 'true');
    }
    if (params?.level) {
      queryParams.append('level', params.level.toString());
    }
    if (params?.parentId) {
      queryParams.append('parentId', params.parentId);
    }
    
    const endpoint = `/api/categories${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await this.request<ApiResponse<Category[]>>(endpoint);
  }
}

// Category interface
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

// Export a singleton instance
export const apiService = new ApiService();
export default apiService;
