import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateStaffToken, AuthenticatedRequest, requireOwnerOrManager } from '../middleware/auth';
import { ProductSerialNumberModel } from '../models/ProductSerialNumberModel';
import { ApiResponseHelper } from '../utils/apiResponse';
import { logger } from '../utils/logger';

const router = Router();
const serialNumberModel = new ProductSerialNumberModel();

/**
 * Add a serial number to a product in a store
 * POST /api/product-serial-numbers
 */
router.post(
  '/',
  authenticateStaffToken,
  requireOwnerOrManager,
  [
    body('productId').trim().isLength({ min: 1 }).withMessage('Product ID is required'),
    body('storeId').trim().isLength({ min: 1 }).withMessage('Store ID is required'),
    body('serialNumber').trim().isLength({ min: 1 }).withMessage('Serial number is required'),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        ApiResponseHelper.validationError(res, 'Validation failed', errors.mapped());
        return;
      }

      logger.info('[ProductSerialNumberRoutes] Adding serial number', {
        productId: req.body.productId,
        storeId: req.body.storeId,
        serialNumber: req.body.serialNumber,
      });

      const serialNumber = await serialNumberModel.addSerialNumber({
        productId: req.body.productId,
        storeId: req.body.storeId,
        serialNumber: req.body.serialNumber,
      });

      ApiResponseHelper.success(
        res,
        serialNumber,
        'Serial number added successfully',
        201
      );
    } catch (error: any) {
      logger.error('[ProductSerialNumberRoutes] Error adding serial number:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        ApiResponseHelper.error(res, 'Serial number already exists for this product in this store', 409);
        return;
      }
      
      ApiResponseHelper.error(res, 'Failed to add serial number', 500, error);
    }
  }
);

/**
 * Add multiple serial numbers at once
 * POST /api/product-serial-numbers/batch
 */
router.post(
  '/batch',
  authenticateStaffToken,
  requireOwnerOrManager,
  [
    body('serialNumbers').isArray({ min: 1 }).withMessage('Serial numbers array is required'),
    body('serialNumbers.*.productId').trim().isLength({ min: 1 }).withMessage('Product ID is required'),
    body('serialNumbers.*.storeId').trim().isLength({ min: 1 }).withMessage('Store ID is required'),
    body('serialNumbers.*.serialNumber').trim().isLength({ min: 1 }).withMessage('Serial number is required'),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        ApiResponseHelper.validationError(res, 'Validation failed', errors.mapped());
        return;
      }

      logger.info('[ProductSerialNumberRoutes] Adding batch serial numbers', {
        count: req.body.serialNumbers.length,
      });

      const serialNumbers = await serialNumberModel.addSerialNumbers(req.body.serialNumbers);

      ApiResponseHelper.success(
        res,
        serialNumbers,
        `Successfully added ${serialNumbers.length} serial number(s)`,
        201
      );
    } catch (error: any) {
      logger.error('[ProductSerialNumberRoutes] Error adding batch serial numbers:', error);
      ApiResponseHelper.error(res, 'Failed to add serial numbers', 500, error);
    }
  }
);

/**
 * Get all serial numbers for a product in a store
 * GET /api/product-serial-numbers/product/:productId/store/:storeId
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

      logger.debug('[ProductSerialNumberRoutes] Getting serial numbers', {
        productId,
        storeId,
      });

      const serialNumbers = await serialNumberModel.getSerialNumbersByProductAndStore(
        productId,
        storeId
      );

      ApiResponseHelper.success(
        res,
        serialNumbers,
        'Serial numbers retrieved successfully'
      );
    } catch (error: any) {
      logger.error('[ProductSerialNumberRoutes] Error getting serial numbers:', error);
      ApiResponseHelper.error(res, 'Failed to retrieve serial numbers', 500, error);
    }
  }
);

/**
 * Get all serial numbers for a product across all stores
 * GET /api/product-serial-numbers/product/:productId
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

      logger.debug('[ProductSerialNumberRoutes] Getting serial numbers for product', {
        productId,
      });

      const serialNumbers = await serialNumberModel.getSerialNumbersByProduct(productId);

      ApiResponseHelper.success(
        res,
        serialNumbers,
        'Serial numbers retrieved successfully'
      );
    } catch (error: any) {
      logger.error('[ProductSerialNumberRoutes] Error getting serial numbers:', error);
      ApiResponseHelper.error(res, 'Failed to retrieve serial numbers', 500, error);
    }
  }
);

/**
 * Delete a serial number
 * DELETE /api/product-serial-numbers/:id
 */
router.delete(
  '/:id',
  authenticateStaffToken,
  requireOwnerOrManager,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        ApiResponseHelper.validationError(res, 'Serial number ID is required');
        return;
      }

      logger.info('[ProductSerialNumberRoutes] Deleting serial number', { id });

      await serialNumberModel.deleteSerialNumber(id);

      ApiResponseHelper.success(
        res,
        null,
        'Serial number deleted successfully',
        204
      );
    } catch (error: any) {
      logger.error('[ProductSerialNumberRoutes] Error deleting serial number:', error);
      ApiResponseHelper.error(res, 'Failed to delete serial number', 500, error);
    }
  }
);

export default router;

