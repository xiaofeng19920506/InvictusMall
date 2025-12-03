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
    if (options?.limit !== undefined) {
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
    logger.info('[ProductService] Creating new product', {
      storeId: productData.storeId,
      name: productData.name,
      price: productData.price,
      stockQuantity: productData.stockQuantity,
      barcode: productData.barcode,
      serialNumber: productData.serialNumber,
      requestedBy: req.staff?.id || req.user?.id,
    });

    // Validate required fields
    if (!productData.storeId || !productData.name || productData.price === undefined) {
      logger.error('[ProductService] Validation failed: Missing required fields', {
        storeId: productData.storeId,
        name: productData.name,
        price: productData.price,
      });
      throw new Error('Store ID, name, and price are required');
    }

    // Verify store exists
    const store = await StoreModel.findById(productData.storeId);
    if (!store) {
      logger.error('[ProductService] Store not found', { storeId: productData.storeId });
      throw new Error('Store not found');
    }
    logger.debug('[ProductService] Store verified', { storeId: store.id, storeName: store.name });

    // Verify store ownership
    const ownershipCheck = await checkStoreOwnership(req, productData.storeId);
    if (!ownershipCheck.authorized) {
      logger.error('[ProductService] Ownership check failed', {
        storeId: productData.storeId,
        staffId: req.staff?.id,
        userId: req.user?.id,
        error: ownershipCheck.error,
      });
      throw new Error(ownershipCheck.error || 'You do not have permission to access this store');
    }
    logger.debug('[ProductService] Ownership verified');

    // Validate price
    if (productData.price < 0) {
      logger.error('[ProductService] Invalid price', { price: productData.price });
      throw new Error('Price cannot be negative');
    }

    // Validate stock quantity
    if (productData.stockQuantity !== undefined && productData.stockQuantity < 0) {
      logger.error('[ProductService] Invalid stock quantity', { stockQuantity: productData.stockQuantity });
      throw new Error('Stock quantity cannot be negative');
    }

    logger.debug('[ProductService] All validations passed, calling ProductModel.create');
    const createdProduct = await ProductModel.create(productData);
    logger.info('[ProductService] Product created successfully', {
      productId: createdProduct.id,
      name: createdProduct.name,
      stockQuantity: createdProduct.stockQuantity,
      storeId: createdProduct.storeId,
    });
    return createdProduct;
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

    // Check ownership for existing store (products cannot be moved between stores)
    const ownershipCheck = await checkStoreOwnership(req, existingProduct.storeId);
    if (!ownershipCheck.authorized) {
      throw new Error(ownershipCheck.error || 'You do not have permission to access this store');
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
