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
  createdAt: Date;
  updatedAt: Date;
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
