import { ProductModel } from '../../models/ProductModel';
import { StoreModel } from '../../models/StoreModel';
import { CreateProductRequest, UpdateProductRequest, Product } from '../../types/product';
import { logger } from '../../utils/logger';
import { checkStoreOwnership } from '../../middleware/auth';
import type { AuthenticatedRequest } from '../../middleware/auth';

export class ProductService {
  /**
   * Get all products for a store
   */
  async getProductsByStore(
    storeId: string,
    options?: { isActive?: boolean; limit?: number; offset?: number }
  ): Promise<{ products: Product[]; total: number }> {
    if (limit !== undefined) {
      return await ProductModel.findByStoreIdWithPagination(storeId, options);
    }
    const products = await ProductModel.findByStoreId(storeId, options);
    return { products, total: products.length };
  }

  /**
   * Get product by barcode
   */
  async getProductByBarcode(barcode: string): Promise<Product | null> {
    return await ProductModel.findByBarcode(barcode);
  }

  /**
   * Get product by ID
   */
  async getProductById(id: string): Promise<Product | null> {
    return await ProductModel.findById(id);
  }

  /**
   * Create a new product
   */
  async createProduct(
    productData: CreateProductRequest,
    req: AuthenticatedRequest
  ): Promise<Product> {
    // Validate required fields
    if (!productData.storeId || !productData.name || productData.price === undefined) {
      throw new Error('Store ID, name, and price are required');
    }

    // Verify store exists
    const store = await StoreModel.findById(productData.storeId);
    if (!store) {
      throw new Error('Store not found');
    }

    // Verify store ownership
    const ownershipCheck = await checkStoreOwnership(req, productData.storeId);
    if (!ownershipCheck.authorized) {
      throw new Error(ownershipCheck.error || 'You do not have permission to access this store');
    }

    // Validate price
    if (productData.price < 0) {
      throw new Error('Price cannot be negative');
    }

    // Validate stock quantity
    if (productData.stockQuantity !== undefined && productData.stockQuantity < 0) {
      throw new Error('Stock quantity cannot be negative');
    }

    return await ProductModel.create(productData);
  }

  /**
   * Update a product
   */
  async updateProduct(
    id: string,
    productData: UpdateProductRequest,
    req: AuthenticatedRequest
  ): Promise<Product> {
    // Verify product exists
    const existingProduct = await ProductModel.findById(id);
    if (!existingProduct) {
      throw new Error('Product not found');
    }

    // Verify store ownership if storeId is being updated
    if (productData.storeId !== undefined && productData.storeId !== existingProduct.storeId) {
      const ownershipCheck = await checkStoreOwnership(req, productData.storeId);
      if (!ownershipCheck.authorized) {
        throw new Error(ownershipCheck.error || 'You do not have permission to access this store');
      }
    } else if (existingProduct.storeId) {
      // Check ownership for existing store
      const ownershipCheck = await checkStoreOwnership(req, existingProduct.storeId);
      if (!ownershipCheck.authorized) {
        throw new Error(ownershipCheck.error || 'You do not have permission to access this store');
      }
    }

    // Validate price if provided
    if (productData.price !== undefined && productData.price < 0) {
      throw new Error('Price cannot be negative');
    }

    // Validate stock quantity if provided
    if (productData.stockQuantity !== undefined && productData.stockQuantity < 0) {
      throw new Error('Stock quantity cannot be negative');
    }

    return await ProductModel.update(id, productData);
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: string, req: AuthenticatedRequest): Promise<void> {
    // Verify product exists
    const existingProduct = await ProductModel.findById(id);
    if (!existingProduct) {
      throw new Error('Product not found');
    }

    // Verify store ownership
    if (existingProduct.storeId) {
      const ownershipCheck = await checkStoreOwnership(req, existingProduct.storeId);
      if (!ownershipCheck.authorized) {
        throw new Error(ownershipCheck.error || 'You do not have permission to access this store');
      }
    }

    await ProductModel.delete(id);
  }

  /**
   * Get last modified timestamp for caching
   */
  async getLastModifiedTimestamp(storeId?: string): Promise<string> {
    if (storeId) {
      return await ProductModel.getLastModifiedTimestamp(storeId);
    }
    return await ProductModel.getLastModifiedTimestamp();
  }
}
