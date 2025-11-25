import { Router, Response } from "express";
import Stripe from "stripe";
import {
  authenticateStaffToken,
  AuthenticatedRequest,
} from "../middleware/auth";
import { OrderModel } from "../models/OrderModel";
import { RefundModel } from "../models/RefundModel";
import { TransactionModel } from "../models/TransactionModel";
import { ApiResponseHelper } from "../utils/apiResponse";
import { logger } from "../utils/logger";

const router = Router();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeClient = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2025-02-24.acacia",
    })
  : null;

const orderModel = new OrderModel();
const refundModel = new RefundModel();
const transactionModel = new TransactionModel();

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
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!stripeClient) {
        return ApiResponseHelper.error(res, "Payment processing is not configured. Please contact support.", 500);
      }

      if (!req.user?.id) {
        return ApiResponseHelper.unauthorized(res, "User authentication required");
      }

      const { orderId } = req.params;
      const { amount, reason, itemIds } = req.body;

      if (!orderId) {
        return ApiResponseHelper.validationError(res, "Order ID is required");
      }

      // Get order
      const order = await orderModel.getOrderById(orderId);
      if (!order) {
        return ApiResponseHelper.notFound(res, "Order");
      }

      let paymentIntentId = order.paymentIntentId;
      
      // Try to extract paymentIntentId from paymentMethod if it's in the format "stripe_payment_intent:pi_xxx"
      if (!paymentIntentId && order.paymentMethod) {
        const paymentMethodMatch = order.paymentMethod.match(/stripe_payment_intent:(pi_[a-zA-Z0-9_]+)/);
        if (paymentMethodMatch && paymentMethodMatch[1]) {
          paymentIntentId = paymentMethodMatch[1];
                logger.info(`Extracted paymentIntentId ${paymentIntentId} from paymentMethod for order ${orderId}`, { orderId, paymentIntentId });
          // Update order record with paymentIntentId
          await orderModel.updateOrderAfterPayment(orderId, {
            paymentIntentId: paymentIntentId,
          });
        }
      }
      
      // If order doesn't have paymentIntentId, try to find it from Stripe
      if (!paymentIntentId && stripeClient) {
        try {
          logger.info(`Searching for payment intent for order ${orderId}`, { orderId, amount: order.totalAmount, createdAt: order.createdAt });
          
          // First, try searching charges (more likely to have orderId in metadata)
          // Search with pagination to find more results
          try {
            let allCharges: Stripe.Charge[] = [];
            let hasMore = true;
            let startingAfter: string | undefined = undefined;
            
            // Collect up to 500 charges
            while (hasMore && allCharges.length < 500) {
              const chargesResponse: Stripe.Response<Stripe.ApiList<Stripe.Charge>> = await stripeClient.charges.list({
                limit: 100,
                starting_after: startingAfter,
              });
              
              allCharges = allCharges.concat(chargesResponse.data);
              hasMore = chargesResponse.has_more;
              if (chargesResponse.data.length > 0) {
                const lastCharge = chargesResponse.data[chargesResponse.data.length - 1];
                if (lastCharge) {
                  startingAfter = lastCharge.id;
                } else {
                  hasMore = false;
                }
              } else {
                hasMore = false;
              }
            }
            
            for (const charge of allCharges) {
              // Check charge metadata for orderId
              if (charge.metadata?.orderId === orderId) {
                const chargePaymentIntentId = typeof charge.payment_intent === 'string' 
                  ? charge.payment_intent 
                  : charge.payment_intent?.id;
                
                if (chargePaymentIntentId) {
                  paymentIntentId = chargePaymentIntentId;
                  await orderModel.updateOrderAfterPayment(orderId, {
                    paymentIntentId: chargePaymentIntentId,
                  });
                  logger.info(`Found paymentIntentId ${chargePaymentIntentId} for order ${orderId} via charge metadata`, { orderId, paymentIntentId: chargePaymentIntentId });
                  break;
                }
              }
              
              // Also check by amount and date
              const orderDate = new Date(order.createdAt);
              const chargeDate = new Date(charge.created * 1000);
              const timeDiff = Math.abs(orderDate.getTime() - chargeDate.getTime());
              const amountMatches = Math.abs(charge.amount / 100 - order.totalAmount) < 0.01;
              
              if (amountMatches && timeDiff < 3600000) {
                const chargePaymentIntentId = typeof charge.payment_intent === 'string' 
                  ? charge.payment_intent 
                  : charge.payment_intent?.id;
                
                if (chargePaymentIntentId) {
                  paymentIntentId = chargePaymentIntentId;
                  await orderModel.updateOrderAfterPayment(orderId, {
                    paymentIntentId: chargePaymentIntentId,
                  });
                  logger.info(`Found paymentIntentId ${chargePaymentIntentId} for order ${orderId} via charge amount/date match`, { orderId, paymentIntentId: chargePaymentIntentId });
                  break;
                }
              }
            }
          } catch (chargeError: any) {
            logger.error("Error searching charges", chargeError, { orderId });
          }

          // If still not found, search payment intents with pagination
          if (!paymentIntentId) {
            let allPaymentIntents: Stripe.PaymentIntent[] = [];
            let hasMore = true;
            let startingAfter: string | undefined = undefined;
            
            // Collect up to 500 payment intents
            while (hasMore && allPaymentIntents.length < 500) {
              const paymentIntentsResponse: Stripe.Response<Stripe.ApiList<Stripe.PaymentIntent>> = await stripeClient.paymentIntents.list({
                limit: 100,
                starting_after: startingAfter,
              });
              
              allPaymentIntents = allPaymentIntents.concat(paymentIntentsResponse.data);
              hasMore = paymentIntentsResponse.has_more;
              if (paymentIntentsResponse.data.length > 0) {
                const lastPaymentIntent = paymentIntentsResponse.data[paymentIntentsResponse.data.length - 1];
                if (lastPaymentIntent) {
                  startingAfter = lastPaymentIntent.id;
                } else {
                  hasMore = false;
                }
              } else {
                hasMore = false;
              }
            }

            const orderDate = new Date(order.createdAt);
            
            for (const pi of allPaymentIntents) {
              // Check if metadata contains orderId or orderIds array
              const metadataOrderIds = pi.metadata?.orderId || 
                (pi.metadata?.orderIds ? (typeof pi.metadata.orderIds === 'string' ? JSON.parse(pi.metadata.orderIds) : pi.metadata.orderIds) : null);
              
              if (metadataOrderIds === orderId || 
                  (Array.isArray(metadataOrderIds) && metadataOrderIds.includes(orderId))) {
                paymentIntentId = pi.id;
                await orderModel.updateOrderAfterPayment(orderId, {
                  paymentIntentId: pi.id,
                });
                logger.info(`Found paymentIntentId ${pi.id} for order ${orderId} via payment intent metadata`, { orderId, paymentIntentId: pi.id });
                break;
              }
              
              // Also check by amount and approximate date (within 1 hour of order creation)
              const piDate = new Date(pi.created * 1000);
              const timeDiff = Math.abs(orderDate.getTime() - piDate.getTime());
              const amountMatches = Math.abs(pi.amount / 100 - order.totalAmount) < 0.01; // Within 1 cent
              
              if (amountMatches && timeDiff < 3600000) { // Within 1 hour
                // Double check by looking at charges associated with this payment intent
                if (pi.latest_charge) {
                  try {
                    const charge = await stripeClient.charges.retrieve(
                      typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge.id
                    );
                    if (charge.metadata?.orderId === orderId) {
                      paymentIntentId = pi.id;
                      await orderModel.updateOrderAfterPayment(orderId, {
                        paymentIntentId: pi.id,
                      });
                      logger.info(`Found paymentIntentId ${pi.id} for order ${orderId} via charge metadata`, { orderId, paymentIntentId: pi.id });
                      break;
                    }
                  } catch (chargeError) {
                    // Ignore charge retrieval errors
                  }
                }
              }
            }
          }
          
          if (!paymentIntentId) {
            logger.warn(`Could not find payment intent for order ${orderId} after searching Stripe`, { orderId });
          }
        } catch (stripeError: any) {
          logger.error("Error searching for payment intent", stripeError, { orderId });
          // Continue with the error handling below
        }
      }

      if (!paymentIntentId) {
        return ApiResponseHelper.error(res, "This order does not have a payment intent. Cannot process refund.", 400);
      }

      // Check if order is refundable
      if (order.status === "cancelled") {
        return ApiResponseHelper.error(res, "Cannot refund a cancelled order", 400);
      }

      // Get existing refunds for this order
      const existingRefunds = await refundModel.findByOrderId(orderId);
      const totalRefunded = await refundModel.getTotalRefundedAmount(orderId);
      const remainingAmount = order.totalAmount - totalRefunded;

      if (remainingAmount <= 0) {
        return ApiResponseHelper.error(res, "Order has already been fully refunded", 400);
      }

      // Determine refund amount
      const refundAmount = amount
        ? Math.min(amount, remainingAmount)
        : remainingAmount;

      if (refundAmount <= 0) {
        return ApiResponseHelper.validationError(res, "Invalid refund amount");
      }

      // Verify PaymentIntent has a successful charge before attempting refund
      try {
        const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
        
        // Check if PaymentIntent is succeeded
        if (paymentIntent.status !== 'succeeded') {
          // Provide more helpful error messages based on PaymentIntent status
          let errorMessage = '';
          let suggestedAction = '';
          
          switch (paymentIntent.status) {
            case 'requires_payment_method':
              errorMessage = 'Payment has not been completed. The payment method is required but not provided.';
              suggestedAction = 'This order cannot be refunded because no payment was received. You should cancel this order instead of processing a refund.';
              break;
            case 'requires_confirmation':
              errorMessage = 'Payment is pending confirmation.';
              suggestedAction = 'This order cannot be refunded until the payment is confirmed. Please wait for the payment to complete or cancel the order if payment fails.';
              break;
            case 'requires_action':
              errorMessage = 'Payment requires additional action (e.g., 3D Secure authentication).';
              suggestedAction = 'This order cannot be refunded until the payment is completed. The customer needs to complete the authentication process.';
              break;
            case 'processing':
              errorMessage = 'Payment is currently being processed.';
              suggestedAction = 'Please wait for the payment to complete before processing a refund.';
              break;
            case 'requires_capture':
              errorMessage = 'Payment has been authorized but not yet captured.';
              suggestedAction = 'You may need to capture the payment first or cancel the authorization.';
              break;
            case 'canceled':
              errorMessage = 'Payment has been canceled.';
              suggestedAction = 'This order cannot be refunded because no payment was received. The order should be canceled instead.';
              break;
            default:
              errorMessage = `Payment status is "${paymentIntent.status}".`;
              suggestedAction = 'This order cannot be refunded because the payment has not been successfully completed.';
          }
          
          return ApiResponseHelper.error(res, `${errorMessage} ${suggestedAction}`, 400, {
            paymentStatus: paymentIntent.status,
            canCancel: ['requires_payment_method', 'canceled'].includes(paymentIntent.status),
            action: 'cancel', // Suggest canceling instead of refunding
          });
        }

        // Check if there's a successful charge
        let chargeId: string | null = null;
        
        // Try to get charge from latest_charge
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

        // If no charge found from latest_charge, try to list charges for this payment intent
        if (!chargeId) {
          try {
            const charges = await stripeClient.charges.list({
              payment_intent: paymentIntentId,
              limit: 10,
            });
            
            const succeededCharge = charges.data.find(c => c.status === 'succeeded');
            if (succeededCharge) {
              chargeId = succeededCharge.id;
            }
          } catch (listError) {
            logger.error('Error listing charges for payment intent', listError, { paymentIntentId, orderId });
          }
        }

        if (!chargeId) {
          return ApiResponseHelper.error(res, "This PaymentIntent does not have a successful charge to refund. The payment may not have been completed.", 400);
        }

        // Create refund in Stripe using charge ID instead of payment_intent
        // This is more reliable when we have the charge ID
        const refundMetadata: Record<string, string> = {
          orderId: order.id,
          refundedBy: req.user.id,
        };
        
        if (itemIds && itemIds.length > 0) {
          refundMetadata.itemIds = JSON.stringify(itemIds);
        }
        
        const refund = await stripeClient.refunds.create({
          charge: chargeId, // Use charge ID instead of payment_intent
          amount: Math.round(refundAmount * 100), // Convert to cents
          reason: reason || undefined,
          metadata: refundMetadata,
        });

        // Save refund record
        const refundRecord = await refundModel.create({
          orderId: order.id,
          paymentIntentId: paymentIntentId,
          refundId: refund.id,
          amount: refundAmount,
          currency: "usd",
          reason: reason || undefined,
          status: refund.status || 'succeeded',
          refundedBy: req.user.id || undefined,
          itemIds: itemIds || undefined,
        });

        // Create transaction record for the refund
        try {
          await transactionModel.createTransaction({
            storeId: order.storeId,
            transactionType: 'refund',
            amount: -refundAmount, // Negative amount for refund
            currency: 'usd',
            description: reason ? `Refund: ${reason}` : `Refund for order ${order.id}`,
            orderId: order.id,
            paymentMethod: order.paymentMethod || undefined,
            status: refund.status === 'succeeded' ? 'completed' : (refund.status === 'pending' ? 'pending' : 'failed'),
            transactionDate: new Date(),
            createdBy: req.user.id || undefined,
            metadata: {
              refundId: refund.id,
              paymentIntentId: paymentIntentId,
              chargeId: chargeId,
              itemIds: itemIds || undefined,
            },
          });
        } catch (transactionError) {
          logger.error("Failed to create transaction record for refund", transactionError, { orderId, refundId: refund.id });
          // Don't fail the refund if transaction record creation fails
        }

        // Check if order is fully refunded after this refund
        // Recalculate total refunded amount to account for this new refund
        const newTotalRefunded = totalRefunded + refundAmount;
        const isFullyRefunded = Math.abs(newTotalRefunded - order.totalAmount) < 0.01 || newTotalRefunded >= order.totalAmount;
        
        // Only update order status to cancelled if fully refunded
        if (isFullyRefunded) {
          await orderModel.updateOrderAfterPayment(order.id, {
            status: "cancelled",
          });
        }

        return ApiResponseHelper.success(res, {
          refund: {
            id: refundRecord.id,
            refundId: refund.id,
            amount: refundAmount,
            status: refund.status,
            reason: reason || undefined,
            createdAt: refundRecord.createdAt,
            itemIds: refundRecord.itemIds,
          },
          remainingAmount: remainingAmount - refundAmount,
        }, "Refund processed successfully");
      } catch (stripeError: any) {
        logger.error("Stripe refund error", stripeError, { orderId, paymentIntentId, userId: req.user?.id });
        
        // Provide more specific error messages
        if (stripeError.type === 'StripeInvalidRequestError') {
          if (stripeError.message?.includes('does not have a successful charge')) {
            return ApiResponseHelper.error(res, "This payment does not have a successful charge to refund. The payment may not have been completed or may have failed.", 400, stripeError);
          }
        }
        
        throw stripeError; // Re-throw to be caught by outer catch block
      }
    } catch (error: any) {
      logger.error("Failed to process refund", error, { orderId: req.params.orderId, userId: req.user?.id });
      return ApiResponseHelper.error(res, "Failed to process refund", 500, error);
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
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return ApiResponseHelper.validationError(res, "Order ID is required");
      }

      const refunds = await refundModel.findByOrderId(orderId);
      const totalRefunded = await refundModel.getTotalRefundedAmount(orderId);

      return ApiResponseHelper.success(res, {
        refunds: refunds.map(refund => ({
          ...refund,
          itemIds: refund.itemIds || undefined,
        })),
        totalRefunded,
      });
    } catch (error: any) {
      logger.error("Failed to fetch refunds", error, { orderId: req.params.orderId, userId: req.user?.id });
      return ApiResponseHelper.error(res, "Failed to fetch refunds", 500, error);
    }
  }
);

export default router;

