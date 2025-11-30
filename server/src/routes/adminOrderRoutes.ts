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
import { ApiResponseHelper } from '../utils/apiResponse';
import { logger } from '../utils/logger';

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
 *           enum: [pending, processing, shipped, delivered, cancelled]
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

      return ApiResponseHelper.successWithPagination(res, orders, total);
    } catch (error) {
      logger.error('Get all orders error', error, { userId: req.user?.id });
      return ApiResponseHelper.error(res, 'Failed to retrieve orders', 500, error);
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
        return ApiResponseHelper.validationError(res, 'Order ID is required');
      }

      const order = await orderModel.getOrderById(orderId);
      if (!order) {
        return ApiResponseHelper.notFound(res, 'Order');
      }

      return ApiResponseHelper.success(res, order);
    } catch (error) {
      logger.error('Get order by ID error', error, { orderId: req.params.id, userId: req.user?.id });
      return ApiResponseHelper.error(res, 'Failed to retrieve order', 500, error);
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
 *                 enum: [pending, processing, shipped, delivered, cancelled]
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
        return ApiResponseHelper.validationError(res, 'Order ID is required');
      }

      const { status, trackingNumber } = req.body;

      if (!status) {
        return ApiResponseHelper.validationError(res, 'Status is required');
      }

      const validStatuses: OrderStatus[] = [
        'pending',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'return_processing',
        'returned'
      ];

      if (!validStatuses.includes(status)) {
        return ApiResponseHelper.validationError(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      // Get order before updating status
      const order = await orderModel.getOrderById(orderId);
      const previousStatus = order.status;
      
      await orderModel.updateOrderStatus(orderId, status, trackingNumber);

      // If order status changes to 'delivered', automatically capture the payment intent
      // This implements Amazon-style payment: authorize at checkout, capture when delivered
      if (status === 'delivered' && previousStatus !== 'delivered' && stripeClient && order.paymentIntentId) {
        try {
          // Retrieve payment intent
          const paymentIntent = await stripeClient.paymentIntents.retrieve(order.paymentIntentId);
          
          // Only capture if payment intent is in requires_capture status (authorized but not captured)
          if (paymentIntent.status === 'requires_capture') {
            try {
              // Capture the payment intent (this actually charges the customer)
              const capturedPaymentIntent = await stripeClient.paymentIntents.capture(order.paymentIntentId);
              
              logger.info(`Payment captured for delivered order ${orderId}`, {
                orderId,
                paymentIntentId: order.paymentIntentId,
                amount: capturedPaymentIntent.amount,
                status: capturedPaymentIntent.status,
              });
              
              // Create transaction record for the capture
              try {
                await transactionModel.createTransaction({
                  storeId: order.storeId,
                  transactionType: 'payment',
                  amount: order.totalAmount,
                  currency: 'usd',
                  description: `Payment captured for delivered order ${order.id}`,
                  orderId: order.id,
                  paymentMethod: order.paymentMethod || undefined,
                  status: capturedPaymentIntent.status === 'succeeded' ? 'completed' : 'pending',
                  transactionDate: new Date(),
                  createdBy: req.user!.id,
                  metadata: {
                    paymentIntentId: order.paymentIntentId,
                    captureType: 'automatic',
                    previousStatus: previousStatus,
                    newStatus: status,
                  },
                });
              } catch (transactionError) {
                logger.error("Failed to create transaction record for payment capture", transactionError, { orderId, paymentIntentId: order.paymentIntentId });
              }
            } catch (captureError: any) {
              logger.error(`Failed to capture payment for delivered order ${orderId}`, captureError, {
                orderId,
                paymentIntentId: order.paymentIntentId,
                errorCode: captureError.code,
                errorType: captureError.type,
              });
              // Don't fail the status update if capture fails - just log it
              // Admin can manually capture later if needed
            }
          } else if (paymentIntent.status === 'succeeded') {
            // Payment already captured, log for reference
            logger.info(`Payment already captured for order ${orderId}`, {
              orderId,
              paymentIntentId: order.paymentIntentId,
            });
          } else {
            logger.warn(`Payment intent ${order.paymentIntentId} is not in requires_capture status (status: ${paymentIntent.status}) when delivering order ${orderId}`, {
              paymentIntentId: order.paymentIntentId,
              orderId,
              status: paymentIntent.status,
            });
          }
        } catch (captureError: any) {
          logger.error(`Error processing payment capture for delivered order ${orderId}`, captureError, { orderId });
          // Don't fail the status update if capture fails - just log it
        }
      }

      // If order is being cancelled, automatically process full refund
      if (status === 'cancelled' && stripeClient) {
        try {
          // Only process refund if order has payment intent and hasn't been fully refunded
          if (order.paymentIntentId) {
            // Recalculate total refunded amount from refunds table to ensure accuracy
            const totalRefunded = await refundModel.getTotalRefundedAmount(orderId);
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
                      logger.error(`Error retrieving charge ${latestChargeId}`, chargeError, { chargeId: latestChargeId, orderId });
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
                      logger.error('Error listing charges for payment intent', listError, { paymentIntentId: order.paymentIntentId });
                    }
                  }
                  
                  // Also try to find charges by metadata (for test charges or charges created separately)
                  if (!chargeId) {
                    try {
                      const charges = await stripeClient.charges.list({
                        limit: 100, // Search recent charges
                      });
                      
                      // Look for charges with matching payment intent ID in metadata
                      const matchingCharge = charges.data.find(c => 
                        c.metadata?.paymentIntentId === order.paymentIntentId && 
                        c.status === 'succeeded'
                      );
                      
                      if (matchingCharge) {
                        chargeId = matchingCharge.id;
                        logger.info(`Found charge by metadata for payment intent ${order.paymentIntentId}`, { chargeId, orderId });
                      }
                    } catch (metadataSearchError) {
                      logger.warn('Error searching charges by metadata', { paymentIntentId: order.paymentIntentId, error: metadataSearchError });
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
                      logger.error("Failed to create transaction record for auto refund", transactionError, { orderId, refundId: refund.id });
                    }
                    
                    logger.info(`Automatic full refund processed for cancelled order ${orderId}: $${remainingAmount}`, { orderId, amount: remainingAmount });
                  } else {
                    logger.warn(`No successful charge found for payment intent ${order.paymentIntentId} when cancelling order ${orderId}`, { paymentIntentId: order.paymentIntentId, orderId });
                  }
                } else {
                  logger.warn(`Payment intent ${order.paymentIntentId} is not succeeded (status: ${paymentIntent.status}) when cancelling order ${orderId}`, { paymentIntentId: order.paymentIntentId, orderId, status: paymentIntent.status });
                }
              } catch (refundError: any) {
                logger.error(`Failed to process automatic refund for cancelled order ${orderId}`, refundError, { orderId, paymentIntentId: order.paymentIntentId });
                // Don't fail the cancellation if refund fails - just log it
              }
            }
          }
        } catch (autoRefundError) {
          logger.error(`Error processing automatic refund for cancelled order ${orderId}`, autoRefundError, { orderId });
          // Don't fail the cancellation if auto-refund fails
        }
      }

      // If order is being marked as returned, automatically process full refund
      if (status === 'returned' && stripeClient) {
        try {
          // Only process refund if order has payment intent and hasn't been fully refunded
          if (order.paymentIntentId) {
            // Recalculate total refunded amount from refunds table to ensure accuracy
            const totalRefunded = await refundModel.getTotalRefundedAmount(orderId);
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
                      logger.error(`Error retrieving charge ${latestChargeId}`, chargeError, { chargeId: latestChargeId, orderId });
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
                      logger.error('Error listing charges for payment intent', listError, { paymentIntentId: order.paymentIntentId });
                    }
                  }
                  
                  // Also try to find charges by metadata (for test charges or charges created separately)
                  if (!chargeId) {
                    try {
                      const charges = await stripeClient.charges.list({
                        limit: 100, // Search recent charges
                      });
                      
                      // Look for charges with matching payment intent ID in metadata
                      const matchingCharge = charges.data.find(c => 
                        c.metadata?.paymentIntentId === order.paymentIntentId && 
                        c.status === 'succeeded'
                      );
                      
                      if (matchingCharge) {
                        chargeId = matchingCharge.id;
                        logger.info(`Found charge by metadata for payment intent ${order.paymentIntentId}`, { chargeId, orderId });
                      }
                    } catch (metadataSearchError) {
                      logger.warn('Error searching charges by metadata', { paymentIntentId: order.paymentIntentId, error: metadataSearchError });
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
                        reason: 'Order returned - automatic full refund',
                      },
                    });
                    
                    // Save refund record
                    await refundModel.create({
                      orderId: order.id,
                      paymentIntentId: order.paymentIntentId,
                      refundId: refund.id,
                      amount: remainingAmount,
                      currency: "usd",
                      reason: "Order returned - automatic full refund",
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
                        description: `Automatic full refund for returned order ${order.id}`,
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
                          returnRefund: true,
                        },
                      });
                    } catch (transactionError) {
                      logger.error("Failed to create transaction record for auto refund", transactionError, { orderId, refundId: refund.id });
                    }
                    
                    logger.info(`Automatic full refund processed for returned order ${orderId}: $${remainingAmount}`, { orderId, amount: remainingAmount });
                  } else {
                    logger.warn(`No successful charge found for payment intent ${order.paymentIntentId} when returning order ${orderId}`, { paymentIntentId: order.paymentIntentId, orderId });
                  }
                } else {
                  logger.warn(`Payment intent ${order.paymentIntentId} is not succeeded (status: ${paymentIntent.status}) when returning order ${orderId}`, { paymentIntentId: order.paymentIntentId, orderId, status: paymentIntent.status });
                }
              } catch (refundError: any) {
                logger.error(`Failed to process automatic refund for returned order ${orderId}`, refundError, { orderId, paymentIntentId: order.paymentIntentId });
                // Don't fail the return if refund fails - just log it
              }
            }
          }
        } catch (autoRefundError) {
          logger.error(`Error processing automatic refund for returned order ${orderId}`, autoRefundError, { orderId });
          // Don't fail the return if auto-refund fails
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
        logger.error('Failed to log order status update', logError, { orderId, userId: req.user?.id });
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
        return ApiResponseHelper.notFound(res, 'Order');
      }

      logger.error('Update order status error', error, { orderId: req.params.id, userId: req.user?.id });
      return ApiResponseHelper.error(res, 'Failed to update order status', 500, error);
    }
  }
);

export default router;

