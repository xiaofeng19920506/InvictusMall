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
  createdAt: Date;
  updatedAt: Date;
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
