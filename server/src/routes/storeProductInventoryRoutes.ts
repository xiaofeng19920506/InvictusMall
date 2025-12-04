import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateStaffToken, AuthenticatedRequest, requireOwnerOrManager } from '../middleware/auth';
import { StoreProductInventoryModel } from '../models/StoreProductInventoryModel';
import { ApiResponseHelper } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import { hasStoreAccess } from '../utils/ownerPermissions';

const router = Router();
const inventoryModel = new StoreProductInventoryModel();

/**
 * Create or update inventory for a product in a store
 * PUT /api/store-product-inventory
 */
router.put(
  '/',
  authenticateStaffToken,
  requireOwnerOrManager,
  [
    body('productId').trim().isLength({ min: 1 }).withMessage('Product ID is required'),
    body('storeId').trim().isLength({ min: 1 }).withMessage('Store ID is required'),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        ApiResponseHelper.validationError(res, 'Validation failed', errors.mapped());
        return;
      }

      // Check if owner has access to this store
      const hasAccess = await hasStoreAccess(req, req.body.storeId);
      if (!hasAccess) {
        ApiResponseHelper.error(res, 'Access denied to this store', 403);
        return;
      }

      logger.info('[StoreProductInventoryRoutes] Upserting inventory', {
        productId: req.body.productId,
        storeId: req.body.storeId,
        quantity: req.body.quantity,
      });

      const inventory = await inventoryModel.upsertInventory({
        productId: req.body.productId,
        storeId: req.body.storeId,
        quantity: req.body.quantity,
      });

      ApiResponseHelper.success(
        res,
        inventory,
        'Inventory updated successfully'
      );
    } catch (error: any) {
      logger.error('[StoreProductInventoryRoutes] Error upserting inventory:', error);
      ApiResponseHelper.error(res, 'Failed to update inventory', 500, error);
    }
  }
);

/**
 * Update inventory quantity (increment/decrement)
 * PATCH /api/store-product-inventory/quantity
 */
router.patch(
  '/quantity',
  authenticateStaffToken,
  requireOwnerOrManager,
  [
    body('productId').trim().isLength({ min: 1 }).withMessage('Product ID is required'),
    body('storeId').trim().isLength({ min: 1 }).withMessage('Store ID is required'),
    body('quantityChange').isInt().withMessage('Quantity change must be an integer'),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        ApiResponseHelper.validationError(res, 'Validation failed', errors.mapped());
        return;
      }

      // Check if owner has access to this store
      const hasAccess = await hasStoreAccess(req, req.body.storeId);
      if (!hasAccess) {
        ApiResponseHelper.error(res, 'Access denied to this store', 403);
        return;
      }

      logger.info('[StoreProductInventoryRoutes] Updating inventory quantity', {
        productId: req.body.productId,
        storeId: req.body.storeId,
        quantityChange: req.body.quantityChange,
      });

      const inventory = await inventoryModel.updateQuantity(
        req.body.productId,
        req.body.storeId,
        req.body.quantityChange
      );

      ApiResponseHelper.success(
        res,
        inventory,
        'Inventory quantity updated successfully'
      );
    } catch (error: any) {
      logger.error('[StoreProductInventoryRoutes] Error updating inventory quantity:', error);
      
      if (error.message && error.message.includes('Cannot decrement inventory that does not exist')) {
        ApiResponseHelper.error(res, error.message, 400);
        return;
      }
      
      ApiResponseHelper.error(res, 'Failed to update inventory quantity', 500, error);
    }
  }
);

/**
 * Get inventory for a product in a specific store
 * GET /api/store-product-inventory/product/:productId/store/:storeId
 */
router.get(
  '/product/:productId/store/:storeId',
  authenticateStaffToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { productId, storeId } = req.params;

      if (!productId || !storeId) {
        ApiResponseHelper.validationError(res, 'Product ID and Store ID are required');
        return;
      }

      // Check if owner has access to this store
      const hasAccess = await hasStoreAccess(req, storeId);
      if (!hasAccess) {
        ApiResponseHelper.error(res, 'Access denied to this store', 403);
        return;
      }

      logger.debug('[StoreProductInventoryRoutes] Getting inventory', {
        productId,
        storeId,
      });

      const inventory = await inventoryModel.getInventoryByProductAndStore(
        productId,
        storeId
      );

      if (!inventory) {
        ApiResponseHelper.success(
          res,
          { quantity: 0 },
          'No inventory record found, defaulting to 0'
        );
        return;
      }

      ApiResponseHelper.success(
        res,
        inventory,
        'Inventory retrieved successfully'
      );
    } catch (error: any) {
      logger.error('[StoreProductInventoryRoutes] Error getting inventory:', error);
      ApiResponseHelper.error(res, 'Failed to retrieve inventory', 500, error);
    }
  }
);

/**
 * Get all inventory records for a product across all stores
 * GET /api/store-product-inventory/product/:productId
 */
router.get(
  '/product/:productId',
  authenticateStaffToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { productId } = req.params;

      if (!productId) {
        ApiResponseHelper.validationError(res, 'Product ID is required');
        return;
      }

      // Get accessible store IDs for owner filtering
      const { getAccessibleStoreIds } = await import('../utils/ownerPermissions');
      const accessibleStoreIds = await getAccessibleStoreIds(req);
      
      // If owner has no accessible stores, return empty
      if (accessibleStoreIds !== null && accessibleStoreIds.length === 0) {
        ApiResponseHelper.success(res, [], 'Inventories retrieved successfully');
        return;
      }

      logger.debug('[StoreProductInventoryRoutes] Getting inventory for product', {
        productId,
      });

      const inventories = await inventoryModel.getInventoryByProduct(productId);
      
      // Filter by accessible stores for owner
      let filteredInventories = inventories;
      if (accessibleStoreIds !== null && accessibleStoreIds.length > 0) {
        filteredInventories = inventories.filter((inv: any) => 
          inv.storeId && accessibleStoreIds.includes(inv.storeId)
        );
      }

      ApiResponseHelper.success(
        res,
        inventories,
        'Inventories retrieved successfully'
      );
    } catch (error: any) {
      logger.error('[StoreProductInventoryRoutes] Error getting inventories:', error);
      ApiResponseHelper.error(res, 'Failed to retrieve inventories', 500, error);
    }
  }
);

/**
 * Get all inventory records for a store
 * GET /api/store-product-inventory/store/:storeId
 */
router.get(
  '/store/:storeId',
  authenticateStaffToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { storeId } = req.params;

      if (!storeId) {
        ApiResponseHelper.validationError(res, 'Store ID is required');
        return;
      }

      // Check if owner has access to this store
      const hasAccess = await hasStoreAccess(req, storeId);
      if (!hasAccess) {
        ApiResponseHelper.error(res, 'Access denied to this store', 403);
        return;
      }

      logger.debug('[StoreProductInventoryRoutes] Getting inventory for store', {
        storeId,
      });

      const inventories = await inventoryModel.getInventoryByStore(storeId);

      ApiResponseHelper.success(
        res,
        inventories,
        'Inventories retrieved successfully'
      );
    } catch (error: any) {
      logger.error('[StoreProductInventoryRoutes] Error getting inventories:', error);
      ApiResponseHelper.error(res, 'Failed to retrieve inventories', 500, error);
    }
  }
);

/**
 * Delete inventory record
 * DELETE /api/store-product-inventory/:id
 */
router.delete(
  '/:id',
  authenticateStaffToken,
  requireOwnerOrManager,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        ApiResponseHelper.validationError(res, 'Inventory ID is required');
        return;
      }

      logger.info('[StoreProductInventoryRoutes] Deleting inventory', { id });

      await inventoryModel.deleteInventory(id);

      ApiResponseHelper.success(
        res,
        null,
        'Inventory deleted successfully',
        204
      );
    } catch (error: any) {
      logger.error('[StoreProductInventoryRoutes] Error deleting inventory:', error);
      ApiResponseHelper.error(res, 'Failed to delete inventory', 500, error);
    }
  }
);

export default router;

