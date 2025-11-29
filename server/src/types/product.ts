export interface Product {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string; // Deprecated: kept for backward compatibility, use imageUrls instead
  imageUrls?: string[]; // Array of image URLs
  stockQuantity: number;
  category?: string;
  barcode?: string; // Product barcode for scanning
  serialNumber?: string; // Serial number (S/N) for tracking individual products
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductRequest {
  storeId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string; // Deprecated: kept for backward compatibility
  imageUrls?: string[]; // Array of image URLs
  stockQuantity?: number;
  category?: string;
  barcode?: string; // Product barcode for scanning
  serialNumber?: string; // Serial number (S/N) for tracking individual products
  isActive?: boolean;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  imageUrl?: string; // Deprecated: kept for backward compatibility
  imageUrls?: string[]; // Array of image URLs
  stockQuantity?: number;
  category?: string;
  barcode?: string; // Product barcode (EAN, UPC, etc.)
  serialNumber?: string; // Serial number (S/N) for tracking individual products
  isActive?: boolean;
}

