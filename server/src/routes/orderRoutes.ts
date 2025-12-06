import { Router, Response, Request } from 'express';
import { OrderModel, CreateOrderRequest } from '../models/OrderModel';
import {
  authenticateUserToken,
  AuthenticatedRequest,
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
 * /api/orders:
 *   get:
 *     summary: Get user's orders
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { status, limit, offset } = req.query;

    const orders = await orderModel.getOrdersByUserId(userId, {
      status: status as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    return ApiResponseHelper.successWithCount(res, orders, orders.length);
  } catch (error) {
    logger.error('Failed to retrieve orders', error, { userId: req.user?.id });
    return ApiResponseHelper.error(res, 'Failed to retrieve orders', 500, error);
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:id",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id as string;
    if (!orderId) {
      return ApiResponseHelper.validationError(res, 'Order ID is required');
    }
    const userId = req.user!.id;

    // Use getOrderByIdAndUserId to ensure user can only access their own orders
    // This is more secure - the database query filters by both orderId AND userId
    // This prevents information leakage (user can't tell if order exists but belongs to someone else)
    const order = await orderModel.getOrderByIdAndUserId(orderId, userId);

    return ApiResponseHelper.success(res, order);
  } catch (error) {
    if (error instanceof Error && error.message === 'Order not found') {
      // Don't reveal whether order exists or not - just return not found
      // This prevents information leakage (user can't tell if order exists but belongs to someone else)
      return ApiResponseHelper.notFound(res, 'Order');
    }

    logger.error('Failed to retrieve order', error, { orderId: req.params.id, userId: req.user?.id });
    return ApiResponseHelper.error(res, 'Failed to retrieve order', 500, error);
  }
});

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - storeId
 *               - storeName
 *               - items
 *               - shippingAddress
 *               - paymentMethod
 *             properties:
 *               storeId:
 *                 type: string
 *               storeName:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                     productName:
 *                       type: string
 *                     productImage:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                     price:
 *                       type: number
 *               shippingAddress:
 *                 type: object
 *               paymentMethod:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const orderData: CreateOrderRequest = {
      ...req.body,
      userId
    };

    // Validate required fields
    if (!orderData.storeId || !orderData.storeName || !orderData.items || !orderData.items.length) {
      return ApiResponseHelper.validationError(res, 'Store ID, store name, and items are required');
    }

    if (!orderData.shippingAddress || !orderData.paymentMethod) {
      return ApiResponseHelper.validationError(res, 'Shipping address and payment method are required');
    }

    const order = await orderModel.createOrder(orderData);

    // Log the activity
    try {
      await ActivityLogModel.createLog({
        type: 'order_created',
        message: `Order ${order.id} created for store "${order.storeName}"`,
        metadata: {
          orderId: order.id,
          userId: order.userId,
          storeId: order.storeId,
          totalAmount: order.totalAmount,
          itemCount: order.items.length
        }
      });
    } catch (logError) {
      logger.warn('Failed to log order creation', { orderId: order.id, error: logError });
    }

    return ApiResponseHelper.success(res, order, 'Order created successfully', 201);
  } catch (error) {
    logger.error('Failed to create order', error, { userId: req.user?.id, storeId: req.body.storeId });
    
    // Handle duplicate reservation conflicts with 409 status
    if (error instanceof Error && error.message.includes('Reservation time slot conflict')) {
      return res.status(409).json({
        success: false,
        message: error.message,
        error: 'RESERVATION_CONFLICT'
      });
    }
    
    return ApiResponseHelper.error(res, 'Failed to create order', 500, error);
  }
});

/**
 * @swagger
 * /api/orders/guest/track:
 *   post:
 *     summary: Track guest orders by email
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "guest@example.com"
 *     responses:
 *       200:
 *         description: Guest orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 count:
 *                   type: integer
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post(
  "/guest/track",
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string' || !email.trim()) {
        return ApiResponseHelper.validationError(res, 'Email is required to track guest orders');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return ApiResponseHelper.validationError(res, 'Please provide a valid email address');
      }

      const orders = await orderModel.getOrdersByGuestEmail(email.trim().toLowerCase());

      const message = orders.length > 0 
        ? `Found ${orders.length} order(s) for this email`
        : 'No orders found for this email address';

      return ApiResponseHelper.successWithCount(res, orders, orders.length, message);
    } catch (error) {
      logger.error('Failed to track guest orders', error, { email: req.body.email });
      return ApiResponseHelper.error(res, 'Failed to track guest orders', 500, error);
    }
  }
);

/**
 * @swagger
 * /api/orders/guest/{id}:
 *   get:
 *     summary: Get guest order by ID (no authentication required)
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Guest email address for verification
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied (email doesn't match)
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/guest/:id",
  async (req: Request, res: Response) => {
    try {
      const orderId = req.params.id as string;
      const email = req.query.email as string;

      if (!orderId) {
        return ApiResponseHelper.validationError(res, 'Order ID is required');
      }

      if (!email || typeof email !== 'string' || !email.trim()) {
        return ApiResponseHelper.validationError(res, 'Email is required to view guest order');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return ApiResponseHelper.validationError(res, 'Please provide a valid email address');
      }

      const order = await orderModel.getOrderById(orderId);

      // Verify that this is a guest order and email matches
      if (order.userId !== null) {
        return ApiResponseHelper.forbidden(res, 'This is not a guest order');
      }

      if (!order.guestEmail || order.guestEmail.toLowerCase() !== email.trim().toLowerCase()) {
        return ApiResponseHelper.forbidden(res, 'Access denied. Email does not match this order');
      }

      return ApiResponseHelper.success(res, order);
    } catch (error) {
      if (error instanceof Error && error.message === 'Order not found') {
        return ApiResponseHelper.notFound(res, 'Order');
      }

      logger.error('Failed to retrieve guest order', error, { orderId: req.params.id, email: req.query.email });
      return ApiResponseHelper.error(res, 'Failed to retrieve order', 500, error);
    }
  }
);

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   post:
 *     summary: Cancel an order (user can only cancel their own orders)
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
 *         description: Order cancelled successfully
 *       400:
 *         description: Order cannot be cancelled (already shipped/delivered/cancelled)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not your order)
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.post(
  "/:id/cancel",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orderId = req.params.id as string;
      const userId = req.user!.id;

      if (!orderId) {
        return ApiResponseHelper.validationError(res, 'Order ID is required');
      }

      // Get order and verify ownership
      const order = await orderModel.getOrderByIdAndUserId(orderId, userId);

      // Check if order can be cancelled (only pending or processing orders can be cancelled)
      if (order.status === 'cancelled') {
        return ApiResponseHelper.error(res, 'Order is already cancelled', 400);
      }

      if (order.status === 'shipped' || order.status === 'delivered') {
        return ApiResponseHelper.error(
          res,
          'Cannot cancel order that has already been shipped or delivered',
          400
        );
      }

      // Only allow cancellation of pending or processing orders
      if (order.status !== 'pending' && order.status !== 'processing') {
        return ApiResponseHelper.error(
          res,
          `Cannot cancel order with status: ${order.status}. Only pending or processing orders can be cancelled.`,
          400
        );
      }

      // Update order status to cancelled
      await orderModel.updateOrderStatus(orderId, 'cancelled');

      // Restore inventory if it was already reduced
      try {
        const { StockOperationService } = await import('../services/stockOperationService');
        const stockOperationService = new StockOperationService();
        
        // Check if inventory was reduced for this order
        const { StockOperationModel } = await import('../models/StockOperationModel');
        const stockOperationModel = new StockOperationModel();
        const { operations } = await stockOperationModel.getAllStockOperations({
          orderId: orderId,
          type: 'out',
        });

        // If stock operations exist, restore inventory by creating stock in operations
        if (operations.length > 0) {
          logger.info(`Restoring inventory for user-cancelled order ${orderId}`, {
            orderId,
            userId,
            stockOperationsCount: operations.length,
          });

          // Group operations by product to restore correct quantities
          const productQuantities: Record<string, number> = {};
          operations.forEach(op => {
            productQuantities[op.productId] = (productQuantities[op.productId] || 0) + op.quantity;
          });

          // Create stock in operations to restore inventory
          for (const [productId, quantity] of Object.entries(productQuantities)) {
            try {
              await stockOperationService.createStockOperation(
                {
                  productId: productId,
                  type: 'in',
                  quantity: quantity,
                  reason: `Order ${orderId} cancelled by user - inventory restored`,
                  orderId: orderId,
                },
                userId
              );

              logger.info(`Inventory restored for product ${productId} (quantity: ${quantity}) for user-cancelled order ${orderId}`);
            } catch (itemError: any) {
              logger.error(`Failed to restore inventory for product ${productId} in user-cancelled order ${orderId}:`, itemError, {
                productId,
                quantity,
                orderId,
              });
              // Continue with other items even if one fails
            }
          }

          logger.info(`Inventory restoration completed for user-cancelled order ${orderId}`);
        } else {
          logger.info(`No inventory to restore for user-cancelled order ${orderId} (no stock out operations found)`);
        }
      } catch (inventoryError: any) {
        logger.error(`Error restoring inventory for user-cancelled order ${orderId}`, inventoryError, { orderId, userId });
        // Don't fail the cancellation if inventory restoration fails - just log it
      }

      // Process automatic refund if payment was made
      if (stripeClient && order.paymentIntentId) {
        try {
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
                
                if (chargeId) {
                  // Create refund in Stripe
                  const refund = await stripeClient.refunds.create({
                    charge: chargeId,
                    amount: Math.round(remainingAmount * 100),
                    reason: 'requested_by_customer',
                    metadata: {
                      orderId: order.id,
                      refundedBy: userId,
                      autoRefund: 'true',
                      reason: 'Order cancelled by user',
                    },
                  });
                  
                  // Save refund record
                  await refundModel.create({
                    orderId: order.id,
                    paymentIntentId: order.paymentIntentId,
                    refundId: refund.id,
                    amount: remainingAmount,
                    currency: "usd",
                    reason: "Order cancelled by user - automatic full refund",
                    status: refund.status || 'succeeded',
                    refundedBy: userId,
                  });
                  
                  // Create transaction record
                  try {
                    await transactionModel.createTransaction({
                      storeId: order.storeId,
                      transactionType: 'refund',
                      amount: -remainingAmount,
                      currency: 'usd',
                      description: `Automatic full refund for user-cancelled order ${order.id}`,
                      orderId: order.id,
                      paymentMethod: order.paymentMethod || undefined,
                      status: refund.status === 'succeeded' ? 'completed' : (refund.status === 'pending' ? 'pending' : 'failed'),
                      transactionDate: new Date(),
                      createdBy: userId,
                      metadata: {
                        refundId: refund.id,
                        paymentIntentId: order.paymentIntentId,
                        chargeId: chargeId,
                        autoRefund: true,
                        cancelledBy: 'user',
                      },
                    });
                  } catch (transactionError) {
                    logger.error("Failed to create transaction record for auto refund", transactionError, { orderId, refundId: refund.id });
                  }
                  
                  logger.info(`Automatic full refund processed for user-cancelled order ${orderId}: $${remainingAmount}`, { orderId, amount: remainingAmount, userId });
                } else {
                  logger.warn(`No successful charge found for payment intent ${order.paymentIntentId} when user cancelling order ${orderId}`, { paymentIntentId: order.paymentIntentId, orderId });
                }
              } else {
                logger.warn(`Payment intent ${order.paymentIntentId} is not succeeded (status: ${paymentIntent.status}) when user cancelling order ${orderId}`, { paymentIntentId: order.paymentIntentId, orderId, status: paymentIntent.status });
              }
            } catch (refundError: any) {
              logger.error(`Failed to process automatic refund for user-cancelled order ${orderId}`, refundError, { orderId, paymentIntentId: order.paymentIntentId });
              // Don't fail the cancellation if refund fails - just log it
            }
          } else {
            logger.info(`Order ${orderId} already fully refunded, skipping automatic refund`, { orderId, totalRefunded });
          }
        } catch (autoRefundError) {
          logger.error(`Error processing automatic refund for user-cancelled order ${orderId}`, autoRefundError, { orderId });
          // Don't fail the cancellation if auto-refund fails
        }
      } else if (!order.paymentIntentId) {
        logger.info(`Order ${orderId} has no payment intent, skipping refund`, { orderId });
      }

      // Log the activity
      try {
        await ActivityLogModel.createLog({
          type: 'order_status_updated',
          message: `Order ${orderId} cancelled by user`,
          metadata: {
            orderId: order.id,
            userId: order.userId,
            storeId: order.storeId,
            totalAmount: order.totalAmount,
            previousStatus: order.status,
            newStatus: 'cancelled',
          }
        });
      } catch (logError) {
        logger.warn('Failed to log order cancellation', { orderId: order.id, error: logError });
      }

      // Get updated order
      const updatedOrder = await orderModel.getOrderByIdAndUserId(orderId, userId);

      return ApiResponseHelper.success(res, updatedOrder, 'Order cancelled successfully. Refund will be processed automatically if payment was made.');
    } catch (error) {
      if (error instanceof Error && error.message === 'Order not found') {
        return ApiResponseHelper.notFound(res, 'Order');
      }

      logger.error('Failed to cancel order', error, { orderId: req.params.id, userId: req.user?.id });
      return ApiResponseHelper.error(res, 'Failed to cancel order', 500, error);
    }
  }
);

export default router;

