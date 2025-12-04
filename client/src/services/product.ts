import { apiService } from './api';

// Server-side Product interface (what comes from API)
export interface ServerProduct {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  price: number;
<<<<<<< HEAD
  imageUrl?: string;
=======
  imageUrl?: string; // Deprecated: kept for backward compatibility
  imageUrls?: string[]; // Array of image URLs
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
  stockQuantity: number;
  category?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Client-side Product interface (what the UI expects)
export interface Product {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  price: number;
<<<<<<< HEAD
  imageUrl?: string;
=======
  imageUrl?: string; // Deprecated: kept for backward compatibility
  imageUrls?: string[]; // Array of image URLs
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
  stockQuantity: number;
  category?: string;
  isActive: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
}

class ProductService {
  private baseUrl: string;

  constructor() {
    let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }
    this.baseUrl = url;
  }

  private transformProduct(serverProduct: ServerProduct): Product {
    return {
      id: serverProduct.id,
      storeId: serverProduct.storeId,
      name: serverProduct.name,
      description: serverProduct.description,
      price: serverProduct.price,
<<<<<<< HEAD
      imageUrl: serverProduct.imageUrl,
=======
      imageUrl: serverProduct.imageUrl, // Backward compatibility
      imageUrls: serverProduct.imageUrls, // New multi-image support
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
      stockQuantity: serverProduct.stockQuantity,
      category: serverProduct.category,
      isActive: serverProduct.isActive,
    };
  }

  private transformProducts(serverProducts: ServerProduct[]): Product[] {
    return serverProducts.map(product => this.transformProduct(product));
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
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response received:', {
          url,
          status: response.status,
          contentType,
          preview: text.substring(0, 200)
        });
        throw new Error(`Expected JSON but received ${contentType}`);
      }
      
      if (!response.ok) {
        const errorData = await response.json();
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

  /**
   * Get all products for a store
   * @param storeId - The store ID
   * @param options - Optional filters (isActive)
   */
  async getProductsByStoreId(
    storeId: string,
    options?: { isActive?: boolean }
  ): Promise<ApiResponse<Product[]>> {
    const queryParams = new URLSearchParams();
    
    if (options?.isActive !== undefined) {
      queryParams.append('isActive', String(options.isActive));
    }

    const endpoint = `/api/products/store/${storeId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.request<ApiResponse<ServerProduct[]>>(endpoint);
    
    return {
      ...response,
      data: this.transformProducts(response.data)
    };
  }

  /**
   * Get product by ID
   * @param id - The product ID
   */
  async getProductById(id: string): Promise<ApiResponse<Product>> {
    const response = await this.request<ApiResponse<ServerProduct>>(`/api/products/${id}`);
    
    return {
      ...response,
      data: this.transformProduct(response.data)
    };
  }
}

// Export a singleton instance
export const productService = new ProductService();
export default productService;

