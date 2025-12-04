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
  serialNumber?: string; // Deprecated: Single serial number for backward compatibility
  serialNumbers?: string[]; // Array of serial numbers for tracking individual products
  storeInventories?: StoreProductInventory[]; // Inventory quantities per store
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreProductInventory {
  storeId: string;
  quantity: number;
  serialNumbers?: string[]; // Serial numbers for this product in this store
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
  serialNumber?: string; // Deprecated: Single serial number for backward compatibility
  serialNumbers?: string[]; // Array of serial numbers for tracking individual products
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
  serialNumber?: string; // Deprecated: Single serial number for backward compatibility
  serialNumbers?: string[]; // Array of serial numbers for tracking individual products
  isActive?: boolean;
}

