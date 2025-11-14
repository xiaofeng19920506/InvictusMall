export interface Location {
  streetAddress: string;
  aptNumber?: string;
  city: string;
  stateProvince: string;
  zipCode: string;
  country: string;
}

export interface Store {
  id: string;
  name: string;
  description: string;
  category: string[];
  rating: number;
  reviewCount: number;
  imageUrl: string;
  isVerified: boolean;
  isActive: boolean;
  location: Location[];
  productsCount: number;
  establishedYear: number;
  discount?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStoreRequest {
  name: string;
  description: string;
  location: Location[];
  establishedYear: number;
  imageUrl?: string;
  category?: string[];
  rating?: number;
  reviewCount?: number;
  isVerified?: boolean;
  isActive?: boolean;
  productsCount?: number;
  discount?: string;
}

export interface UpdateStoreRequest extends Partial<CreateStoreRequest> {}

export interface ActivityLog {
  id: string;
  type: 'store_created' | 'store_updated' | 'store_deleted' | 'store_verified';
  message: string;
  timestamp: Date;
  storeName?: string;
  storeId?: string;
  userId?: string;
  userName?: string;
  metadata?: Record<string, any>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
}
