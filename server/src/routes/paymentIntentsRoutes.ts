import { Router, Response, Request } from "express";
import Stripe from "stripe";
import {
  authenticateUserToken,
  AuthenticatedRequest,
} from "../middleware/auth";
import { ShippingAddressModel } from "../models/ShippingAddressModel";
import { OrderModel, Order } from "../models/OrderModel";
import { ApiResponseHelper } from "../utils/apiResponse";
import { logger } from "../utils/logger";

const router = Router();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  logger.warn("Stripe secret key (STRIPE_SECRET_KEY) is not configured. Payment routes will be disabled.");
}

const stripeClient = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2025-02-24.acacia",
    })
  : null;

const shippingAddressModel = new ShippingAddressModel();
const orderModel = new OrderModel();

interface CheckoutItem {
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  price: number;
  storeId: string;
  storeName: string;
  // Reservation fields (only for services)
  reservationDate?: string;
  reservationTime?: string;
  reservationNotes?: string;
  isReservation?: boolean;
}

interface PaymentIntentRequest {
  items: CheckoutItem[];
  shippingAddressId?: string;
  newShippingAddress?: {
    fullName: string;
    phoneNumber: string;
    streetAddress: string;
    aptNumber?: string;
    city: string;
    stateProvince: string;
    zipCode: string;
    country: string;
  };
  saveNewAddress?: boolean;
}

/**
 * @swagger
 * /api/payments/create-payment-intent:
 *   post:
 *     summary: Create a Payment Intent for credit card payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *               shippingAddressId:
 *                 type: string
 *               newShippingAddress:
 *                 type: object
 *     responses:
 *       200:
 *         description: Payment Intent created successfully
 */
router.post(
  "/create-payment-intent",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!stripeClient) {
        return ApiResponseHelper.error(res, "Payment processing is not configured. Please contact support.", 500);
      }

      if (!req.user?.id) {
        return ApiResponseHelper.unauthorized(res, "User authentication required");
      }

      const { items, shippingAddressId, newShippingAddress, saveNewAddress } =
        req.body as PaymentIntentRequest;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return ApiResponseHelper.validationError(res, "Items are required");
      }

      // Validate shipping address
      let resolvedAddress;
      if (shippingAddressId) {
        const addresses = await shippingAddressModel.getAddressesByUserId(req.user.id);
        const address = addresses.find((a) => a.id === shippingAddressId);
        if (!address) {
          return ApiResponseHelper.validationError(res, "Invalid shipping address");
        }
        resolvedAddress = {
          streetAddress: address.streetAddress,
          aptNumber: address.aptNumber,
          city: address.city,
          stateProvince: address.stateProvince,
          zipCode: address.zipCode,
          country: address.country,
        };
      } else if (newShippingAddress) {
        if (
          !newShippingAddress.fullName ||
          !newShippingAddress.phoneNumber ||
          !newShippingAddress.streetAddress ||
          !newShippingAddress.city ||
          !newShippingAddress.stateProvince ||
          !newShippingAddress.zipCode ||
          !newShippingAddress.country
        ) {
          return ApiResponseHelper.validationError(res, "Complete shipping address is required");
        }
        resolvedAddress = {
          streetAddress: newShippingAddress.streetAddress,
          aptNumber: newShippingAddress.aptNumber,
          city: newShippingAddress.city,
          stateProvince: newShippingAddress.stateProvince,
          zipCode: newShippingAddress.zipCode,
          country: newShippingAddress.country,
        };

        // Save address if requested
        if (saveNewAddress) {
          await shippingAddressModel.createAddress(req.user.id, {
            fullName: newShippingAddress.fullName,
            phoneNumber: newShippingAddress.phoneNumber,
            streetAddress: newShippingAddress.streetAddress,
            aptNumber: newShippingAddress.aptNumber,
            city: newShippingAddress.city,
            stateProvince: newShippingAddress.stateProvince,
            zipCode: newShippingAddress.zipCode,
            country: newShippingAddress.country,
          });
        }
      } else {
        return ApiResponseHelper.validationError(res, "Shipping address is required");
      }

      // Calculate total amount
      const totalAmount = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      if (totalAmount <= 0) {
        return ApiResponseHelper.validationError(res, "Invalid order total");
      }

      // Group items by store
      const itemsByStore = new Map<
        string,
        { storeId: string; storeName: string; items: CheckoutItem[] }
      >();

      for (const item of items) {
        if (!itemsByStore.has(item.storeId)) {
          itemsByStore.set(item.storeId, {
            storeId: item.storeId,
            storeName: item.storeName,
            items: [],
          });
        }
        itemsByStore.get(item.storeId)!.items.push(item);
      }

      // Create Payment Intent
      // Amazon-style: Payment Intent is created but payment is confirmed on frontend
      // This allows for immediate card validation and processing before order review
      const paymentIntent = await stripeClient.paymentIntents.create({
        amount: Math.round(totalAmount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          userId: req.user.id,
          shippingAddress: JSON.stringify(resolvedAddress),
          itemsCount: items.length.toString(),
        },
        // Use automatic_payment_methods for card payments
        // This allows manual confirmation on the frontend using confirmCardPayment
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never', // Don't allow redirects for card payments
        },
      });

      // Create pending orders
      const orderIds: string[] = [];
      const now = new Date();

      for (const { storeId, storeName, items: storeItems } of itemsByStore.values()) {
        const storeTotal = storeItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );

        const order = await orderModel.createOrder({
          userId: req.user.id,
          storeId,
          storeName,
          items: storeItems.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            productImage: item.productImage,
            quantity: item.quantity,
            price: item.price,
            // Include reservation fields if present
            reservationDate: item.reservationDate,
            reservationTime: item.reservationTime,
            reservationNotes: item.reservationNotes,
            isReservation: item.isReservation,
          })),
          shippingAddress: resolvedAddress,
          paymentMethod: `stripe_payment_intent:${paymentIntent.id}`,
          paymentIntentId: paymentIntent.id,
          status: "pending",
        });

        orderIds.push(order.id);
      }

      return ApiResponseHelper.success(res, {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        orderIds,
      });
    } catch (error: any) {
      logger.error("Failed to create payment intent", error, {
        userId: req.user?.id,
        itemsCount: req.body.items?.length,
        errorCode: error.code,
        errorType: error.type,
        statusCode: error.statusCode,
      });
      return ApiResponseHelper.error(res, "Failed to create payment intent", 500, error);
    }
  }
);

/**
 * @swagger
 * /api/payments/confirm-payment:
 *   post:
 *     summary: Confirm payment after card is processed
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentIntentId
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment confirmed and orders finalized
 */
router.post(
  "/confirm-payment",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!stripeClient) {
        return ApiResponseHelper.error(res, "Payment processing is not configured. Please contact support.", 500);
      }

      if (!req.user?.id) {
        return ApiResponseHelper.unauthorized(res, "User authentication required");
      }

      const { paymentIntentId } = req.body;

      if (!paymentIntentId) {
        return ApiResponseHelper.validationError(res, "Payment Intent ID is required");
      }

      // Retrieve Payment Intent from Stripe
      const paymentIntent = await stripeClient.paymentIntents.retrieve(
        paymentIntentId
      );

      // Verify user owns this payment intent
      if (paymentIntent.metadata?.userId !== req.user.id) {
        return ApiResponseHelper.forbidden(res, "You do not have permission to confirm this payment");
      }

      // Amazon-style checkout flow:
      // Payment is already confirmed on frontend (in PaymentMethodStep)
      // This endpoint just finalizes the order after payment confirmation
      // Check payment status - must be succeeded (confirmed on frontend)
      if (paymentIntent.status !== "succeeded") {
        return ApiResponseHelper.error(res, `Payment has not been completed. Status: ${paymentIntent.status}. Please complete payment first.`, 400);
      }

      // Update orders to processing status (Amazon-style: payment done, now finalize order)
      const orders = await orderModel.getOrdersByPaymentIntentId(paymentIntentId);
      const now = new Date();

      for (const order of orders) {
        await orderModel.updateOrderAfterPayment(order.id, {
          status: "processing",
          paymentMethod: `stripe_payment_intent:${paymentIntentId}`,
          paymentIntentId: paymentIntentId,
          orderDate: now,
        });
      }

      return ApiResponseHelper.success(res, {
        orderIds: orders.map((o) => o.id),
      }, "Payment confirmed successfully");
    } catch (error: any) {
      logger.error("Failed to confirm payment", error, { paymentIntentId: req.body.paymentIntentId, userId: req.user?.id });
      return ApiResponseHelper.error(res, "Failed to confirm payment", 500, error);
    }
  }
);

export default router;

