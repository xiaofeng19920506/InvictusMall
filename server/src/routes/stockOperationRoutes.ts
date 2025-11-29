import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticateStaffToken, AuthenticatedRequest, requireOwnerOrManager } from '../middleware/auth';
import { StockOperationService } from '../services/stockOperationService';
import { ApiResponseHelper } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import { StockOperationModel } from '../models/StockOperationModel';

const router = Router();
const stockOperationService = new StockOperationService();
const stockOperationModel = new StockOperationModel();

/**
 * @swagger
 * /api/stock-operations:
 *   post:
 *     summary: Create a stock operation (in/out)
 *     tags: [Stock Operations]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - type
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [in, out]
 *               quantity:
 *                 type: integer
 *               reason:
 *                 type: string
 *               orderId:
 *                 type: string
 *                 description: Optional order ID for stock out operations
 *     responses:
 *       200:
 *         description: Stock operation created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  '/',
  authenticateStaffToken,
  requireOwnerOrManager,
  [
    body('productId').trim().isLength({ min: 1 }).withMessage('Product ID is required'),
    body('type').isIn(['in', 'out']).withMessage('Type must be either "in" or "out"'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('reason').optional().trim(),
    body('orderId').optional().trim(),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        ApiResponseHelper.validationError(res, 'Validation failed', errors.mapped());
        return;
      }

      const staffId = req.staff?.id || req.user?.id;
      if (!staffId) {
        ApiResponseHelper.error(res, 'Staff ID not found', 401);
        return;
      }

      logger.info('Creating stock operation', {
        productId: req.body.productId,
        type: req.body.type,
        quantity: req.body.quantity,
        reason: req.body.reason,
        orderId: req.body.orderId,
        performedBy: staffId,
      });

      const result = await stockOperationService.createStockOperation(
        req.body,
        staffId
      );
      
      logger.info('Stock operation created successfully', {
        operationId: result.operation.id,
        productId: result.operation.productId,
        previousQuantity: result.operation.previousQuantity,
        newQuantity: result.operation.newQuantity,
      });

      ApiResponseHelper.success(
        res,
        {
          operation: result.operation,
          orderUpdated: result.orderUpdated,
          orderStatus: result.orderStatus,
        },
        `Stock ${req.body.type === 'in' ? 'in' : 'out'} operation completed successfully`
      );
    } catch (error: any) {
      logger.error('Error creating stock operation:', error);
      
      if (error.message === 'Product not found') {
        ApiResponseHelper.notFound(res, 'Product');
        return;
      }
      
      if (error.message.includes('Insufficient stock')) {
        ApiResponseHelper.error(res, error.message, 400);
        return;
      }
      
      ApiResponseHelper.error(res, 'Failed to create stock operation', 500, error);
    }
  }
);

/**
 * @swagger
 * /api/stock-operations:
 *   get:
 *     summary: Get all stock operations with filters and pagination
 *     tags: [Stock Operations]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [in, out]
 *       - in: query
 *         name: performedBy
 *         schema:
 *           type: string
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Stock operations retrieved successfully
 */
router.get(
  '/',
  authenticateStaffToken,
  [
    query('productId').optional().trim(),
    query('type').optional().isIn(['in', 'out']),
    query('performedBy').optional().trim(),
    query('orderId').optional().trim(),
    query('limit').optional().isInt({ min: 1 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        ApiResponseHelper.validationError(res, 'Validation failed', errors.mapped());
        return;
      }

      const options: any = {
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      if (req.query.productId) {
        options.productId = req.query.productId as string;
      }
      if (req.query.type) {
        options.type = req.query.type as 'in' | 'out';
      }
      if (req.query.performedBy) {
        options.performedBy = req.query.performedBy as string;
      }
      if (req.query.orderId) {
        options.orderId = req.query.orderId as string;
      }

      // Get operations with details
      const result = await stockOperationService.getStockOperationsWithDetails(options);

      ApiResponseHelper.success(
        res,
        result,
        'Stock operations retrieved successfully'
      );
    } catch (error: any) {
      logger.error('Error fetching stock operations:', error);
      ApiResponseHelper.error(res, 'Failed to fetch stock operations', 500, error);
    }
  }
);

/**
 * @swagger
 * /api/stock-operations/{id}:
 *   get:
 *     summary: Get stock operation by ID
 *     tags: [Stock Operations]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stock operation retrieved successfully
 *       404:
 *         description: Stock operation not found
 */
router.get(
  '/:id',
  authenticateStaffToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        ApiResponseHelper.validationError(res, 'Stock operation ID is required');
        return;
      }

      const operation = await stockOperationModel.getStockOperationById(id);
      
      ApiResponseHelper.success(
        res,
        operation,
        'Stock operation retrieved successfully'
      );
    } catch (error: any) {
      if (error.message === 'Stock operation not found') {
        ApiResponseHelper.notFound(res, 'Stock operation');
        return;
      }
      logger.error('Error fetching stock operation:', error);
      ApiResponseHelper.error(res, 'Failed to fetch stock operation', 500, error);
    }
  }
);

/**
 * @swagger
 * /api/stock-operations/product/{productId}:
 *   get:
 *     summary: Get stock operations for a specific product
 *     tags: [Stock Operations]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Stock operations retrieved successfully
 */
router.get(
  '/product/:productId',
  authenticateStaffToken,
  [
    query('limit').optional().isInt({ min: 1 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        ApiResponseHelper.validationError(res, 'Validation failed', errors.mapped());
        return;
      }

      const { productId } = req.params;
      if (!productId) {
        ApiResponseHelper.validationError(res, 'Product ID is required');
        return;
      }

      const options = {
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const result = await stockOperationModel.getStockOperationsByProductId(productId, options);
      
      ApiResponseHelper.success(
        res,
        result,
        'Stock operations retrieved successfully'
      );
    } catch (error: any) {
      logger.error('Error fetching stock operations:', error);
      ApiResponseHelper.error(res, 'Failed to fetch stock operations', 500, error);
    }
  }
);

export default router;

