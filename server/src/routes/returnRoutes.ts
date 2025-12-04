import { Router, Response } from 'express';
import { ReturnModel } from '../models/ReturnModel';
import { OrderModel } from '../models/OrderModel';
import {
  authenticateStaffToken,
  AuthenticatedRequest,
} from "../middleware/auth";
import { body, param, validationResult } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation';
import { ApiResponseHelper } from '../utils/apiResponse';
import { logger } from '../utils/logger';

const router = Router();
const returnModel = new ReturnModel();
const orderModel = new OrderModel();

/**
 * @swagger
 * /api/returns/order/{orderId}:
 *   get:
 *     summary: Get all returns for an order
 *     tags: [Returns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Returns retrieved successfully
 */
router.get(
  "/order/:orderId",
  authenticateStaffToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return ApiResponseHelper.validationError(res, "Order ID is required");
      }

      const returns = await returnModel.findByOrderId(orderId);

      return ApiResponseHelper.success(res, returns);
    } catch (error: any) {
      logger.error("Failed to fetch returns", error, { orderId: req.params.orderId, userId: req.user?.id });
      return ApiResponseHelper.error(res, "Failed to fetch returns", 500, error);
    }
  }
);

/**
 * @swagger
 * /api/returns:
 *   post:
 *     summary: Create a return request
 *     tags: [Returns]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - orderItemId
 *               - reason
 *             properties:
 *               orderId:
 *                 type: string
 *               orderItemId:
 *                 type: string
 *               reason:
 *                 type: string
 *               condition:
 *                 type: string
 *                 enum: [new, refurbished, open_box, used]
 *                 description: Optional condition of returned item (usually set when receiving)
 *               isDisposed:
 *                 type: boolean
 *                 description: Optional disposal flag (usually set when receiving)
 *     responses:
 *       200:
 *         description: Return request created successfully
 */
router.post(
  "/",
  authenticateStaffToken,
  [
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('orderItemId').notEmpty().withMessage('Order item ID is required'),
    body('reason').notEmpty().withMessage('Reason is required'),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return ApiResponseHelper.unauthorized(res, "User authentication required");
      }

      const { orderId, orderItemId, reason, condition, isDisposed } = req.body;

      // Verify order exists and belongs to user (or user is admin/staff)
      const order = await orderModel.getOrderById(orderId);
      if (!order) {
        return ApiResponseHelper.notFound(res, "Order");
      }

      // Check if order item exists in the order
      const orderItem = order.items.find(item => item.id === orderItemId);
      if (!orderItem) {
        return ApiResponseHelper.notFound(res, "Order item");
      }

      // Check if there's already a pending return for this item
      const existingReturns = await returnModel.findByOrderItemId(orderItemId);
      const hasPendingReturn = existingReturns.some(r => r.status === 'pending' || r.status === 'approved');
      
      if (hasPendingReturn) {
        return ApiResponseHelper.error(res, "A return request already exists for this item", 400);
      }

      const returnRequest = await returnModel.create({
        orderId,
        orderItemId,
        userId: order.userId || req.user.id,
        reason,
        condition,
        isDisposed,
      });

      return ApiResponseHelper.success(res, returnRequest, "Return request created successfully");
    } catch (error: any) {
      logger.error("Failed to create return", error, { orderId: req.body.orderId, userId: req.user?.id });
      return ApiResponseHelper.error(res, "Failed to create return request", 500, error);
    }
  }
);

/**
 * @swagger
 * /api/returns/{id}/status:
 *   put:
 *     summary: Update return status
 *     tags: [Returns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected, received, refunded]
 *               refundAmount:
 *                 type: number
 *               returnTrackingNumber:
 *                 type: string
 *               condition:
 *                 type: string
 *                 enum: [new, refurbished, open_box, used]
 *                 description: Condition of returned item (required when status is 'received' and isDisposed is false)
 *               isDisposed:
 *                 type: boolean
 *                 description: Whether the item is disposed (if true, inventory won't be added back)
 *     responses:
 *       200:
 *         description: Return status updated successfully
 */
router.put(
  "/:id/status",
  authenticateStaffToken,
  [
    param('id').notEmpty().withMessage('Return ID is required'),
    body('status').isIn(['pending', 'approved', 'rejected', 'received', 'refunded']).withMessage('Invalid status'),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status, refundAmount, returnTrackingNumber, condition, isDisposed } = req.body;

      if (!id) {
        return ApiResponseHelper.validationError(res, "Return ID is required");
      }

      const returnRequest = await returnModel.findById(id);
      if (!returnRequest) {
        return ApiResponseHelper.notFound(res, "Return request");
      }

      // Validate condition when status is 'received'
      if (status === 'received') {
        if (isDisposed === undefined || isDisposed === false) {
          // If not disposed, condition is required
          if (!condition || !['new', 'refurbished', 'open_box', 'used'].includes(condition)) {
            return ApiResponseHelper.validationError(
              res,
              "Condition is required when receiving return (must be: new, refurbished, open_box, or used). Set isDisposed=true if item is disposed."
            );
          }
        }
      }

      const previousStatus = returnRequest.status;
      const updatedReturn = await returnModel.updateStatus(id, {
        status,
        refundAmount,
        returnTrackingNumber,
        condition,
        isDisposed,
      });

      // If status changed to 'received' and item is not disposed, add inventory back
      if (status === 'received' && previousStatus !== 'received' && !isDisposed && condition) {
        try {
          // Get order and order item details
          const order = await orderModel.getOrderById(returnRequest.orderId);
          const orderItem = order.items.find(item => item.id === returnRequest.orderItemId);

          if (orderItem && !orderItem.isReservation) {
            // Update store inventory with the specified condition
            const { StoreProductInventoryModel } = await import('../models/StoreProductInventoryModel');
            const inventoryModel = new StoreProductInventoryModel();
            
            // Get current inventory for this condition
            const currentInventory = await inventoryModel.getInventoryByProductAndStore(
              orderItem.productId,
              order.storeId,
              condition as 'new' | 'refurbished' | 'open_box' | 'used'
            );

            if (currentInventory) {
              // Update existing inventory for this condition
              await inventoryModel.upsertInventory({
                productId: orderItem.productId,
                storeId: order.storeId,
                quantity: currentInventory.quantity + orderItem.quantity,
                condition: condition as 'new' | 'refurbished' | 'open_box' | 'used',
              });
            } else {
              // Create new inventory record for this condition
              await inventoryModel.upsertInventory({
                productId: orderItem.productId,
                storeId: order.storeId,
                quantity: orderItem.quantity,
                condition: condition as 'new' | 'refurbished' | 'open_box' | 'used',
              });
            }

            // Also update total product stock quantity
            // Import stock operation service to record the operation and update total stock
            const { StockOperationService } = await import('../services/stockOperationService');
            const stockOperationService = new StockOperationService();

            // Create stock in operation to update total stock quantity
            await stockOperationService.createStockOperation(
              {
                productId: orderItem.productId,
                type: 'in',
                quantity: orderItem.quantity,
                reason: `Return ${id} received - condition: ${condition}`,
                orderId: returnRequest.orderId,
              },
              req.user!.id
            );

            logger.info(`Inventory added back for returned item`, {
              returnId: id,
              productId: orderItem.productId,
              quantity: orderItem.quantity,
              condition,
              storeId: order.storeId,
            });
          }
        } catch (inventoryError: any) {
          logger.error(`Failed to add inventory for returned item ${id}:`, inventoryError, {
            returnId: id,
            orderId: returnRequest.orderId,
            orderItemId: returnRequest.orderItemId,
          });
          // Don't fail the return status update if inventory update fails
          // Admin can manually adjust inventory later if needed
        }
      }

      return ApiResponseHelper.success(res, updatedReturn, "Return status updated successfully");
    } catch (error: any) {
      logger.error("Failed to update return status", error, { returnId: req.params.id, userId: req.user?.id });
      return ApiResponseHelper.error(res, "Failed to update return status", 500, error);
    }
  }
);

/**
 * @swagger
 * /api/returns/{id}:
 *   get:
 *     summary: Get return by ID
 *     tags: [Returns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Return retrieved successfully
 */
router.get(
  "/:id",
  authenticateStaffToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponseHelper.validationError(res, "Return ID is required");
      }

      const returnRequest = await returnModel.findById(id);
      if (!returnRequest) {
        return ApiResponseHelper.notFound(res, "Return request");
      }

      return ApiResponseHelper.success(res, returnRequest);
    } catch (error: any) {
      logger.error("Failed to fetch return", error, { returnId: req.params.id, userId: req.user?.id });
      return ApiResponseHelper.error(res, "Failed to fetch return", 500, error);
    }
  }
);

export default router;

