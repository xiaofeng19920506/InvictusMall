import { Router, Response } from 'express';
import { OrderModel, OrderStatus } from '../models/OrderModel';
import {
  authenticateStaffToken,
  AuthenticatedRequest,
  requireAdmin,
} from "../middleware/auth";
import { ActivityLogModel } from '../models/ActivityLogModel';
import { RefundModel } from '../models/RefundModel';
import { TransactionModel } from '../models/TransactionModel';
import Stripe from 'stripe';

const router = Router();
const orderModel = new OrderModel();
const refundModel = new RefundModel();
const transactionModel = new TransactionModel();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeClient = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2025-02-24.acacia",
    })
  : null;

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
  authenticateStaffToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, storeId, userId, limit, offset } = req.query;

      const { orders, total } = await orderModel.getAllOrders({
        status: status as string | undefined,
        storeId: storeId as string | undefined,
        userId: userId as string | undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      });

      return res.json({
        success: true,
        data: orders,
        count: orders.length,
        total
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
 * /api/admin/orders/{id}:
 *   get:
 *     summary: Get order by ID (Admin only)
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
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:id",
  authenticateStaffToken,
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

      const order = await orderModel.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      return res.json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Get order by ID error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve order',
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
  authenticateStaffToken,
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

      // Get order before updating status
      const order = await orderModel.getOrderById(orderId);
      
      await orderModel.updateOrderStatus(orderId, status, trackingNumber);

      // If order is being cancelled, automatically process full refund
      if (status === 'cancelled' && stripeClient) {
        try {
          // Only process refund if order has payment intent and hasn't been fully refunded
          if (order.paymentIntentId) {
            const totalRefunded = order.totalRefunded || 0;
            const remainingAmount = order.totalAmount - totalRefunded;
            
            if (remainingAmount > 0.01) {
              try {
                // Get payment intent
                const paymentIntent = await stripeClient.paymentIntents.retrieve(order.paymentIntentId);
                
                if (paymentIntent.status === 'succeeded') {
                  // Find successful charge
                  let chargeId: string | null = null;
                  
                  if (paymentIntent.latest_charge) {
                    const latestChargeId = typeof paymentIntent.latest_charge === 'string' 
                      ? paymentIntent.latest_charge 
                      : paymentIntent.latest_charge.id;
                    
                    try {
                      const charge = await stripeClient.charges.retrieve(latestChargeId);
                      if (charge.status === 'succeeded') {
                        chargeId = charge.id;
                      }
                    } catch (chargeError) {
                      console.error(`Error retrieving charge ${latestChargeId}:`, chargeError);
                    }
                  }
                  
                  // If no charge found from latest_charge, try to list charges
                  if (!chargeId) {
                    try {
                      const charges = await stripeClient.charges.list({
                        payment_intent: order.paymentIntentId,
                        limit: 10,
                      });
                      
                      const succeededCharge = charges.data.find(c => c.status === 'succeeded');
                      if (succeededCharge) {
                        chargeId = succeededCharge.id;
                      }
                    } catch (listError) {
                      console.error('Error listing charges for payment intent:', listError);
                    }
                  }
                  
                  if (chargeId) {
                    // Create refund in Stripe
                    const refund = await stripeClient.refunds.create({
                      charge: chargeId,
                      amount: Math.round(remainingAmount * 100),
                      reason: 'requested_by_customer',
                      metadata: {
                        orderId: order.id,
                        refundedBy: req.user!.id,
                        autoRefund: 'true',
                        reason: 'Order cancelled',
                      },
                    });
                    
                    // Save refund record
                    await refundModel.create({
                      orderId: order.id,
                      paymentIntentId: order.paymentIntentId,
                      refundId: refund.id,
                      amount: remainingAmount,
                      currency: "usd",
                      reason: "Order cancelled - automatic full refund",
                      status: refund.status || 'succeeded',
                      refundedBy: req.user!.id,
                    });
                    
                    // Create transaction record
                    try {
                      await transactionModel.createTransaction({
                        storeId: order.storeId,
                        transactionType: 'refund',
                        amount: -remainingAmount,
                        currency: 'usd',
                        description: `Automatic full refund for cancelled order ${order.id}`,
                        orderId: order.id,
                        paymentMethod: order.paymentMethod || undefined,
                        status: refund.status === 'succeeded' ? 'completed' : (refund.status === 'pending' ? 'pending' : 'failed'),
                        transactionDate: new Date(),
                        createdBy: req.user!.id,
                        metadata: {
                          refundId: refund.id,
                          paymentIntentId: order.paymentIntentId,
                          chargeId: chargeId,
                          autoRefund: true,
                        },
                      });
                    } catch (transactionError) {
                      console.error("Failed to create transaction record for auto refund:", transactionError);
                    }
                    
                    console.log(`Automatic full refund processed for cancelled order ${orderId}: $${remainingAmount}`);
                  } else {
                    console.warn(`No successful charge found for payment intent ${order.paymentIntentId} when cancelling order ${orderId}`);
                  }
                } else {
                  console.warn(`Payment intent ${order.paymentIntentId} is not succeeded (status: ${paymentIntent.status}) when cancelling order ${orderId}`);
                }
              } catch (refundError: any) {
                console.error(`Failed to process automatic refund for cancelled order ${orderId}:`, refundError);
                // Don't fail the cancellation if refund fails - just log it
              }
            }
          }
        } catch (autoRefundError) {
          console.error(`Error processing automatic refund for cancelled order ${orderId}:`, autoRefundError);
          // Don't fail the cancellation if auto-refund fails
        }
      }

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

