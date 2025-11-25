import { Router, Response } from 'express';
import { ReturnModel } from '../models/ReturnModel';
import { OrderModel } from '../models/OrderModel';
import {
  authenticateStaffToken,
  AuthenticatedRequest,
} from "../middleware/auth";
import { body, param, validationResult } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation';

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
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        res.status(400).json({
          success: false,
          message: "Order ID is required",
        });
        return;
      }

      const returns = await returnModel.findByOrderId(orderId);

      res.json({
        success: true,
        data: returns,
      });
    } catch (error: any) {
      console.error("Failed to fetch returns:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch returns",
        error: error.message,
      });
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
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      const { orderId, orderItemId, reason } = req.body;

      // Verify order exists and belongs to user (or user is admin/staff)
      const order = await orderModel.getOrderById(orderId);
      if (!order) {
        res.status(404).json({
          success: false,
          message: "Order not found",
        });
        return;
      }

      // Check if order item exists in the order
      const orderItem = order.items.find(item => item.id === orderItemId);
      if (!orderItem) {
        res.status(404).json({
          success: false,
          message: "Order item not found",
        });
        return;
      }

      // Check if there's already a pending return for this item
      const existingReturns = await returnModel.findByOrderItemId(orderItemId);
      const hasPendingReturn = existingReturns.some(r => r.status === 'pending' || r.status === 'approved');
      
      if (hasPendingReturn) {
        res.status(400).json({
          success: false,
          message: "A return request already exists for this item",
        });
        return;
      }

      const returnRequest = await returnModel.create({
        orderId,
        orderItemId,
        userId: order.userId || req.user.id,
        reason,
      });

      res.json({
        success: true,
        message: "Return request created successfully",
        data: returnRequest,
      });
    } catch (error: any) {
      console.error("Failed to create return:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create return request",
        error: error.message,
      });
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
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status, refundAmount, returnTrackingNumber } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          message: "Return ID is required",
        });
        return;
      }

      const returnRequest = await returnModel.findById(id);
      if (!returnRequest) {
        res.status(404).json({
          success: false,
          message: "Return request not found",
        });
        return;
      }

      const updatedReturn = await returnModel.updateStatus(id, {
        status,
        refundAmount,
        returnTrackingNumber,
      });

      res.json({
        success: true,
        message: "Return status updated successfully",
        data: updatedReturn,
      });
    } catch (error: any) {
      console.error("Failed to update return status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update return status",
        error: error.message,
      });
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
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: "Return ID is required",
        });
        return;
      }

      const returnRequest = await returnModel.findById(id);
      if (!returnRequest) {
        res.status(404).json({
          success: false,
          message: "Return request not found",
        });
        return;
      }

      res.json({
        success: true,
        data: returnRequest,
      });
    } catch (error: any) {
      console.error("Failed to fetch return:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch return",
        error: error.message,
      });
    }
  }
);

export default router;

