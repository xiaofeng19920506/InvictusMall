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

      const { orderId, orderItemId, reason } = req.body;

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
      const { status, refundAmount, returnTrackingNumber } = req.body;

      if (!id) {
        return ApiResponseHelper.validationError(res, "Return ID is required");
      }

      const returnRequest = await returnModel.findById(id);
      if (!returnRequest) {
        return ApiResponseHelper.notFound(res, "Return request");
      }

      const updatedReturn = await returnModel.updateStatus(id, {
        status,
        refundAmount,
        returnTrackingNumber,
      });

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

