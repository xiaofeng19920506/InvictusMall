export interface Product {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  stockQuantity: number;
  category?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductRequest {
  storeId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  stockQuantity?: number;
  category?: string;
  isActive?: boolean;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  stockQuantity?: number;
  category?: string;
  isActive?: boolean;
}

