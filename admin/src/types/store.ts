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
  location: Location[];
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

export interface CreateStoreRequest {
  name: string;
  description: string;
  category: string[];
  rating: number;
  reviewCount: number;
  imageUrl: string;
  isVerified: boolean;
  location: Location[];
  productsCount: number;
  establishedYear: number;
  discount?: string;
  membership?: {
    type: 'basic' | 'premium' | 'platinum';
    benefits: string[];
    discountPercentage: number;
    prioritySupport: boolean;
  };
}

export interface UpdateStoreRequest extends Partial<CreateStoreRequest> {}

export interface ActivityLog {
  id: string;
  type: 'store_created' | 'store_updated' | 'store_deleted' | 'store_verified';
  message: string;
  timestamp: Date;
  storeName?: string;
  storeId?: string;
  metadata?: Record<string, any>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
}
