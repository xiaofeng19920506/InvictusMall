import { Router, Response } from 'express';
import { OrderModel, OrderStatus } from '../models/OrderModel';
import {
  authenticateUserToken,
  AuthenticatedRequest,
  requireAdmin,
} from "../middleware/auth";
import { ActivityLogModel } from '../models/ActivityLogModel';

const router = Router();
const orderModel = new OrderModel();

/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     summary: Get all orders (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending_payment, pending, processing, shipped, delivered, cancelled]
 *         description: Filter orders by status
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *         description: Filter orders by store ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter orders by user ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of orders to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of orders to skip
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       500:
 *         description: Internal server error
 */
router.get(
  "/",
  authenticateUserToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, storeId, userId, limit, offset } = req.query;

      const orders = await orderModel.getAllOrders({
        status: status as string | undefined,
        storeId: storeId as string | undefined,
        userId: userId as string | undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      });

      return res.json({
        success: true,
        data: orders,
        count: orders.length
      });
    } catch (error) {
      console.error('Get all orders error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve orders',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/orders/{id}/status:
 *   put:
 *     summary: Update order status (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
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
 *                 enum: [pending_payment, pending, processing, shipped, delivered, cancelled]
 *               trackingNumber:
 *                 type: string
 *                 description: Optional tracking number (for shipped status)
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.put(
  "/:id/status",
  authenticateUserToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orderId = req.params.id as string;
      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required'
        });
      }

      const { status, trackingNumber } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }

      const validStatuses: OrderStatus[] = [
        'pending_payment',
        'pending',
        'processing',
        'shipped',
        'delivered',
        'cancelled'
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      await orderModel.updateOrderStatus(orderId, status, trackingNumber);

      // Log the activity
      try {
        await ActivityLogModel.createLog({
          type: 'order_status_updated',
          message: `Order ${orderId} status updated to "${status}" by admin`,
          metadata: {
            orderId,
            newStatus: status,
            trackingNumber: trackingNumber || null,
            updatedBy: req.user!.id
          }
        });
      } catch (logError) {
        console.error('Failed to log order status update:', logError);
      }

      // Get updated order to return
      const updatedOrder = await orderModel.getOrderById(orderId);

      return res.json({
        success: true,
        data: updatedOrder,
        message: 'Order status updated successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Order not found') {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      console.error('Update order status error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update order status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;

