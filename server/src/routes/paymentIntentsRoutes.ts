import { Router, Response, Request } from "express";
import Stripe from "stripe";
import {
  authenticateUserToken,
  AuthenticatedRequest,
} from "../middleware/auth";
import { ShippingAddressModel } from "../models/ShippingAddressModel";
import { OrderModel, Order } from "../models/OrderModel";

const router = Router();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.warn(
    "Stripe secret key (STRIPE_SECRET_KEY) is not configured. Payment routes will be disabled."
  );
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

      const { items, shippingAddressId, newShippingAddress, saveNewAddress } =
        req.body as PaymentIntentRequest;

      if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          success: false,
          message: "Items are required",
        });
        return;
      }

      // Validate shipping address
      let resolvedAddress;
      if (shippingAddressId) {
        const addresses = await shippingAddressModel.getAddressesByUserId(req.user.id);
        const address = addresses.find((a) => a.id === shippingAddressId);
        if (!address) {
          res.status(400).json({
            success: false,
            message: "Invalid shipping address",
          });
          return;
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
          res.status(400).json({
            success: false,
            message: "Complete shipping address is required",
          });
          return;
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
        res.status(400).json({
          success: false,
          message: "Shipping address is required",
        });
        return;
      }

      // Calculate total amount
      const totalAmount = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      if (totalAmount <= 0) {
        res.status(400).json({
          success: false,
          message: "Invalid order total",
        });
        return;
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
          status: "pending_payment",
        });

        orderIds.push(order.id);
      }

      res.json({
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          orderIds,
        },
      });
    } catch (error: any) {
      console.error("Failed to create payment intent:", error);
      console.error("Error stack:", error.stack);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        type: error.type,
        statusCode: error.statusCode,
      });
      res.status(500).json({
        success: false,
        message: "Failed to create payment intent",
        error: error.message || "Unknown error",
        ...(process.env.NODE_ENV === "development" && {
          details: error.stack,
        }),
      });
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

      const { paymentIntentId } = req.body;

      if (!paymentIntentId) {
        res.status(400).json({
          success: false,
          message: "Payment Intent ID is required",
        });
        return;
      }

      // Retrieve Payment Intent from Stripe
      const paymentIntent = await stripeClient.paymentIntents.retrieve(
        paymentIntentId
      );

      // Verify user owns this payment intent
      if (paymentIntent.metadata?.userId !== req.user.id) {
        res.status(403).json({
          success: false,
          message: "You do not have permission to confirm this payment",
        });
        return;
      }

      // Amazon-style checkout flow:
      // Payment is already confirmed on frontend (in PaymentMethodStep)
      // This endpoint just finalizes the order after payment confirmation
      // Check payment status - must be succeeded (confirmed on frontend)
      if (paymentIntent.status !== "succeeded") {
        res.status(400).json({
          success: false,
          message: `Payment has not been completed. Status: ${paymentIntent.status}. Please complete payment first.`,
        });
        return;
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

      res.json({
        success: true,
        message: "Payment confirmed successfully",
        data: {
          orderIds: orders.map((o) => o.id),
        },
      });
    } catch (error: any) {
      console.error("Failed to confirm payment:", error);
      res.status(500).json({
        success: false,
        message: "Failed to confirm payment",
        error: error.message,
      });
    }
  }
);

export default router;

