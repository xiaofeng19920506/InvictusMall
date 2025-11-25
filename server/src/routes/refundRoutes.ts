import { Router, Response } from "express";
import Stripe from "stripe";
import {
  authenticateStaffToken,
  AuthenticatedRequest,
} from "../middleware/auth";
import { OrderModel } from "../models/OrderModel";
import { RefundModel } from "../models/RefundModel";

const router = Router();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeClient = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2025-02-24.acacia",
    })
  : null;

const orderModel = new OrderModel();
const refundModel = new RefundModel();

/**
 * @swagger
 * /api/refunds/{orderId}:
 *   post:
 *     summary: Create a refund for an order
 *     tags: [Refunds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Refund amount (if not provided, full refund)
 *               reason:
 *                 type: string
 *                 enum: [duplicate, fraudulent, requested_by_customer]
 *     responses:
 *       200:
 *         description: Refund created successfully
 */
router.post(
  "/:orderId",
  authenticateStaffToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!stripeClient) {
        res.status(500).json({
          success: false,
          message: "Payment processing is not configured. Please contact support.",
        });
        return;
      }

      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      const { orderId } = req.params;
      const { amount, reason } = req.body;

      if (!orderId) {
        res.status(400).json({
          success: false,
          message: "Order ID is required",
        });
        return;
      }

      // Get order
      const order = await orderModel.getOrderById(orderId);
      if (!order) {
        res.status(404).json({
          success: false,
          message: "Order not found",
        });
        return;
      }

      const paymentIntentId = order.paymentIntentId;
      if (!paymentIntentId) {
        res.status(400).json({
          success: false,
          message: "This order does not have a payment intent. Cannot process refund.",
        });
        return;
      }

      // Check if order is refundable
      if (order.status === "cancelled") {
        res.status(400).json({
          success: false,
          message: "Cannot refund a cancelled order",
        });
        return;
      }

      // Get existing refunds for this order
      const existingRefunds = await refundModel.findByOrderId(orderId);
      const totalRefunded = await refundModel.getTotalRefundedAmount(orderId);
      const remainingAmount = order.totalAmount - totalRefunded;

      if (remainingAmount <= 0) {
        res.status(400).json({
          success: false,
          message: "Order has already been fully refunded",
        });
        return;
      }

      // Determine refund amount
      const refundAmount = amount
        ? Math.min(amount, remainingAmount)
        : remainingAmount;

      if (refundAmount <= 0) {
        res.status(400).json({
          success: false,
          message: "Invalid refund amount",
        });
        return;
      }

      // Create refund in Stripe
      const refund = await stripeClient.refunds.create({
        payment_intent: paymentIntentId,
        amount: Math.round(refundAmount * 100), // Convert to cents
        reason: reason || undefined,
        metadata: {
          orderId: order.id,
          refundedBy: req.user.id,
        },
      });

      // Save refund record
      const refundRecord = await refundModel.create({
        orderId: order.id,
        paymentIntentId: paymentIntentId, // Already validated as non-null above
        refundId: refund.id,
        amount: refundAmount,
        currency: "usd",
        reason: reason || undefined,
        status: refund.status || 'succeeded',
        refundedBy: req.user.id || undefined,
      });

      // Update order status if fully refunded
      if (refundAmount >= remainingAmount) {
        await orderModel.updateOrderAfterPayment(order.id, {
          status: "cancelled",
        });
      }

      res.json({
        success: true,
        message: "Refund processed successfully",
        data: {
          refund: {
            id: refundRecord.id,
            refundId: refund.id,
            amount: refundAmount,
            status: refund.status,
            reason: reason || undefined,
            createdAt: refundRecord.createdAt,
          },
          remainingAmount: remainingAmount - refundAmount,
        },
      });
    } catch (error: any) {
      console.error("Failed to process refund:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process refund",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/refunds/order/{orderId}:
 *   get:
 *     summary: Get refunds for an order
 *     tags: [Refunds]
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
 *         description: Refunds retrieved successfully
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

      const refunds = await refundModel.findByOrderId(orderId);
      const totalRefunded = await refundModel.getTotalRefundedAmount(orderId);

      res.json({
        success: true,
        data: {
          refunds,
          totalRefunded,
        },
      });
    } catch (error: any) {
      console.error("Failed to fetch refunds:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch refunds",
        error: error.message,
      });
    }
  }
);

export default router;

