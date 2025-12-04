import { Response } from 'express';
import { ProductService } from '../../services/product/productService';
import { ApiResponseHelper } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';
import { handleETagValidation } from '../../utils/cacheUtils';
import type { AuthenticatedRequest } from '../../middleware/auth';

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  /**
   * Get all products for a store
   */
  getProductsByStore = async (req: any, res: Response): Promise<void> => {
    try {
      const { storeId } = req.params;
      const { isActive, limit, offset } = req.query;

      if (!storeId) {
        ApiResponseHelper.validationError(res, 'Store ID is required');
        return;
      }

      // Generate ETag for caching
      const lastModified = await this.productService.getLastModifiedTimestamp(storeId);
      const cacheKey = `${storeId}-${isActive || ''}-${limit || ''}-${offset || ''}`;
      
      if (handleETagValidation(req, res, lastModified, cacheKey)) {
        return; // 304 Not Modified
      }

      const options: { isActive?: boolean; limit?: number; offset?: number } = {};
      if (isActive !== undefined) {
        options.isActive = isActive === 'true';
      }
      if (limit !== undefined) {
        options.limit = parseInt(limit as string) || undefined;
      }
      if (offset !== undefined) {
        options.offset = parseInt(offset as string) || undefined;
      }

      const { products, total } = await this.productService.getProductsByStore(storeId, options);
      if (limit !== undefined) {
        ApiResponseHelper.successWithPagination(res, products, total);
      } else {
        ApiResponseHelper.successWithCount(res, products, total);
      }
    } catch (error) {
      logger.error('Failed to fetch products', error, { storeId: req.params.storeId });
      ApiResponseHelper.error(res, 'Failed to fetch products', 500, error);
    }
  };

  /**
   * Get product by barcode
   */
  getProductByBarcode = async (req: any, res: Response): Promise<void> => {
    try {
      const { barcode } = req.params;

      if (!barcode) {
        ApiResponseHelper.validationError(res, 'Barcode is required');
        return;
      }

      logger.debug('Searching for product with barcode', { barcode });
      const product = await this.productService.getProductByBarcode(barcode);

      if (!product) {
        logger.debug('Product not found with barcode', { barcode });
        ApiResponseHelper.notFound(res, 'Product');
        return;
      }

      logger.debug('Product found', { productId: product.id, name: product.name });
      ApiResponseHelper.success(res, product);
    } catch (error) {
      logger.error('Error fetching product by barcode', error, { barcode: req.params.barcode });
      ApiResponseHelper.error(res, 'Failed to fetch product', 500, error);
    }
  };

  /**
   * Get product by ID
   */
  getProductById = async (req: any, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        ApiResponseHelper.validationError(res, 'Product ID is required');
        return;
      }

      // Generate ETag for caching
      const lastModified = await this.productService.getLastModifiedTimestamp();
      const cacheKey = `product-${id}`;
      
      if (handleETagValidation(req, res, lastModified, cacheKey)) {
        return; // 304 Not Modified
      }

      const product = await this.productService.getProductById(id);

      if (!product) {
        ApiResponseHelper.notFound(res, 'Product');
        return;
      }

      ApiResponseHelper.success(res, product);
    } catch (error) {
      logger.error('Failed to fetch product', error, { productId: req.params.id });
      ApiResponseHelper.error(res, 'Failed to fetch product', 500, error);
    }
  };

  /**
   * Create a new product
   */
  createProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      logger.info('[ProductController] Create product request received', {
        storeId: req.body.storeId,
        name: req.body.name,
        price: req.body.price,
        stockQuantity: req.body.stockQuantity,
        requestedBy: req.staff?.id || req.user?.id,
      });

      const product = await this.productService.createProduct(req.body, req);
      
      logger.info('[ProductController] Product created successfully', {
        productId: product.id,
        name: product.name,
        stockQuantity: product.stockQuantity,
        storeId: product.storeId,
      });

      ApiResponseHelper.success(res, product, 'Product created successfully', 201);
    } catch (error: any) {
      logger.error('Failed to create product', error, { 
        userId: req.user?.id || req.staff?.id,
        storeId: req.body.storeId 
      });

      if (error.message === 'Store not found') {
        ApiResponseHelper.notFound(res, 'Store');
        return;
      }

      if (error.message.includes('permission') || error.message.includes('authorized')) {
        ApiResponseHelper.error(res, error.message, 403, error);
        return;
      }

      if (error.message.includes('required') || error.message.includes('cannot be negative')) {
        ApiResponseHelper.validationError(res, error.message);
        return;
      }

      ApiResponseHelper.error(res, 'Failed to create product', 500, error);
    }
  };

  /**
   * Update a product
   */
  updateProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        ApiResponseHelper.validationError(res, 'Product ID is required');
        return;
      }

      const product = await this.productService.updateProduct(id, req.body, req);
      ApiResponseHelper.success(res, product, 'Product updated successfully');
    } catch (error: any) {
      logger.error('Failed to update product', error, { 
        productId: req.params.id,
        userId: req.user?.id || req.staff?.id 
      });

      if (error.message === 'Product not found') {
        ApiResponseHelper.notFound(res, 'Product');
        return;
      }

      if (error.message.includes('permission') || error.message.includes('authorized')) {
        ApiResponseHelper.error(res, error.message, 403, error);
        return;
      }

      if (error.message.includes('cannot be negative')) {
        ApiResponseHelper.validationError(res, error.message);
        return;
      }

      ApiResponseHelper.error(res, 'Failed to update product', 500, error);
    }
  };

  /**
   * Delete a product
   */
  deleteProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        ApiResponseHelper.validationError(res, 'Product ID is required');
        return;
      }

      await this.productService.deleteProduct(id, req);
      ApiResponseHelper.success(res, null, 'Product deleted successfully');
    } catch (error: any) {
      logger.error('Failed to delete product', error, { 
        productId: req.params.id,
        userId: req.user?.id || req.staff?.id 
      });

      if (error.message === 'Product not found') {
        ApiResponseHelper.notFound(res, 'Product');
        return;
      }

      if (error.message.includes('permission') || error.message.includes('authorized')) {
        ApiResponseHelper.error(res, error.message, 403, error);
        return;
      }

      ApiResponseHelper.error(res, 'Failed to delete product', 500, error);
    }
  };
}

