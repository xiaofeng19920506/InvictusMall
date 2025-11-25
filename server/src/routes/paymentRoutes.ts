import { Router, Response, Request } from "express";
import {
  authenticateUserToken,
  AuthenticatedRequest,
} from "../middleware/auth";
import { ShippingAddressModel } from "../models/ShippingAddressModel";
import { OrderModel } from "../models/OrderModel";
import { ApiResponseHelper } from "../utils/apiResponse";
import { logger } from "../utils/logger";
import {
  getStripeClient,
  getStripeWebhookSecret,
  getAppUrl,
} from "../services/payment/stripeConfig";
import { CheckoutFinalizationError } from "../services/payment/types";
import {
  validateCheckoutPayload,
  groupItemsByStore,
} from "../services/payment/checkoutValidationService";
import {
  buildLineItems,
  createCheckoutSession,
  preparePendingOrders,
  cleanupFailedCheckout,
} from "../services/payment/checkoutSessionService";
import { getOrCreateStripeCustomer } from "../services/payment/customerService";
import { finalizeStripeCheckoutSession } from "../services/payment/checkoutCompletionService";
import { handleStripeWebhook } from "../services/payment/webhookService";
import { CheckoutPayload } from "../services/payment/types";

const router = Router();

const stripeClient = getStripeClient();
const shippingAddressModel = new ShippingAddressModel();
const orderModel = new OrderModel();
const stripeWebhookSecret = getStripeWebhookSecret();

router.post(
  "/checkout-session",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!stripeClient) {
        return ApiResponseHelper.error(
          res,
          "Stripe is not configured. Please contact support.",
          500
        );
      }

      const userId = req.user?.id;
      if (!userId) {
        return ApiResponseHelper.unauthorized(res, "Unauthorized");
      }

      const payload = req.body as CheckoutPayload;

      const userEmail = req.user?.email;
      if (!userEmail) {
        return ApiResponseHelper.validationError(
          res,
          "User email is required to start checkout."
        );
      }

      // Validate checkout payload
      const validation = validateCheckoutPayload(payload);
      if (!validation.isValid) {
        return ApiResponseHelper.validationError(
          res,
          validation.error || "Invalid checkout data."
        );
      }

      // Group items by store
      const itemsByStore = groupItemsByStore(payload.items);

      const { shippingAddressId, newShippingAddress, saveNewAddress } = payload;

      let shippingAddress: CheckoutPayload["newShippingAddress"] | undefined;

      if (shippingAddressId) {
        try {
          const existingAddress = await shippingAddressModel.getAddressById(
            shippingAddressId
          );
          if (existingAddress.userId !== userId) {
            return ApiResponseHelper.forbidden(
              res,
              "Selected shipping address does not belong to the user."
            );
          }

          shippingAddress = {
            fullName: existingAddress.fullName,
            phoneNumber: existingAddress.phoneNumber,
            streetAddress: existingAddress.streetAddress,
            aptNumber: existingAddress.aptNumber,
            city: existingAddress.city,
            stateProvince: existingAddress.stateProvince,
            zipCode: existingAddress.zipCode,
            country: existingAddress.country,
          };
        } catch (error) {
          return ApiResponseHelper.notFound(res, "Shipping address");
        }
      } else if (newShippingAddress) {
        const trimmedAddress = {
          fullName: newShippingAddress.fullName.trim(),
          phoneNumber: newShippingAddress.phoneNumber.trim(),
          streetAddress: newShippingAddress.streetAddress.trim(),
          aptNumber: newShippingAddress.aptNumber?.trim() || undefined,
          city: newShippingAddress.city.trim(),
          stateProvince: newShippingAddress.stateProvince.trim(),
          zipCode: newShippingAddress.zipCode.trim(),
          country: newShippingAddress.country.trim(),
        };

        if (
          !trimmedAddress.fullName ||
          !trimmedAddress.phoneNumber ||
          !trimmedAddress.streetAddress ||
          !trimmedAddress.city ||
          !trimmedAddress.stateProvince ||
          !trimmedAddress.zipCode ||
          !trimmedAddress.country
        ) {
          return ApiResponseHelper.validationError(
            res,
            "Please complete all required shipping address fields."
          );
        }

        shippingAddress = trimmedAddress;

        if (saveNewAddress) {
          try {
            await shippingAddressModel.createAddress(userId, {
              fullName: trimmedAddress.fullName,
              phoneNumber: trimmedAddress.phoneNumber,
              streetAddress: trimmedAddress.streetAddress,
              aptNumber: trimmedAddress.aptNumber,
              city: trimmedAddress.city,
              stateProvince: trimmedAddress.stateProvince,
              zipCode: trimmedAddress.zipCode,
              country: trimmedAddress.country,
              isDefault: false,
            });
          } catch (error) {
            logger.error("Failed to save shipping address", error, { userId });
            return ApiResponseHelper.error(
              res,
              "Failed to save shipping address.",
              500,
              error
            );
          }
        }
      } else {
        return ApiResponseHelper.validationError(
          res,
          "Please select or provide a shipping address."
        );
      }

      if (!shippingAddress) {
        return ApiResponseHelper.error(
          res,
          "Unable to resolve shipping address for checkout session.",
          500
        );
      }

      const appUrl = getAppUrl();
      const lineItems = buildLineItems(payload.items);
      const customerId = await getOrCreateStripeCustomer(
        stripeClient,
        userEmail,
        shippingAddress.fullName
      );

      const persistedShippingAddress = {
        streetAddress: shippingAddress.streetAddress,
        aptNumber: shippingAddress.aptNumber,
        city: shippingAddress.city,
        stateProvince: shippingAddress.stateProvince,
        zipCode: shippingAddress.zipCode,
        country: shippingAddress.country,
      };

      const session = await createCheckoutSession(
        stripeClient,
        lineItems,
        customerId,
        {
          userId,
          save_new_address: saveNewAddress ? "true" : "false",
          shipping_address: JSON.stringify(shippingAddress),
          item_count: String(
            payload.items.reduce(
              (count, item) => count + Math.max(0, item.quantity || 0),
              0
            )
          ),
          store_count: String(
            new Set(payload.items.map((item) => item.storeId)).size
          ),
        },
        appUrl
      );

      if (!session.url) {
        return ApiResponseHelper.error(
          res,
          "Stripe checkout session was created without a redirect URL. Please try again.",
          500
        );
      }

      try {
        await preparePendingOrders(
          orderModel,
          itemsByStore,
          session.id,
          userId,
          persistedShippingAddress
        );
      } catch (error) {
        logger.error(
          "Failed to prepare pending orders for checkout session",
          error,
          { sessionId: session.id, userId }
        );

        await cleanupFailedCheckout(
          stripeClient,
          orderModel,
          session.id,
          logger
        );

        return ApiResponseHelper.error(
          res,
          "Unable to prepare your checkout session. Please try again in a moment.",
          500
        );
      }

      return ApiResponseHelper.success(res, { checkoutUrl: session.url });
    } catch (error) {
      logger.error("Failed to create Stripe checkout session", error, {
        userId: req.user?.id,
      });
      return ApiResponseHelper.error(
        res,
        error instanceof Error
          ? error.message
          : "Failed to start Stripe checkout. Please try again.",
        500,
        error
      );
    }
  }
);

router.post(
  "/checkout-complete",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!stripeClient) {
        return ApiResponseHelper.error(
          res,
          "Stripe is not configured. Please contact support.",
          500
        );
      }

      const userId = req.user?.id;
      if (!userId) {
        return ApiResponseHelper.unauthorized(res, "Unauthorized");
      }

      const { sessionId } = req.body as { sessionId?: string };

      if (!sessionId || typeof sessionId !== "string") {
        return ApiResponseHelper.validationError(
          res,
          "A valid Stripe checkout session ID is required."
        );
      }

      const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
        expand: ["customer"],
      });

      if (!session) {
        return ApiResponseHelper.notFound(res, "Checkout session");
      }

      if (session.metadata?.userId !== userId) {
        return ApiResponseHelper.forbidden(
          res,
          "You do not have permission to finalize this order."
        );
      }

      if (session.payment_status !== "paid") {
        return ApiResponseHelper.error(
          res,
          "Payment has not been completed for this session. Please try again after payment is confirmed.",
          400
        );
      }

      let orderIds: string[] = [];
      try {
        orderIds = await finalizeStripeCheckoutSession(
          stripeClient,
          orderModel,
          session,
          {
            expectedUserId: userId,
          }
        );
      } catch (error) {
        if (error instanceof CheckoutFinalizationError) {
          return ApiResponseHelper.error(
            res,
            error.message,
            error.statusCode,
            error
          );
        }

        throw error;
      }

      try {
        await stripeClient.checkout.sessions.update(sessionId, {
          metadata: {
            ...(session.metadata || {}),
            orders_created: "true",
          },
        });
      } catch (updateError) {
        logger.warn("Unable to update Stripe checkout session metadata", {
          sessionId,
          updateError,
        });
      }

      return ApiResponseHelper.success(
        res,
        { orderIds },
        "Order has been recorded successfully."
      );
    } catch (error) {
      logger.error("Failed to finalize Stripe checkout session", error, {
        sessionId: req.body?.sessionId,
        userId: req.user?.id,
      });
      return ApiResponseHelper.error(
        res,
        error instanceof Error
          ? error.message
          : "Failed to finalize checkout session. Please contact support.",
        500,
        error
      );
    }
  }
);

export async function stripeWebhookHandler(req: Request, res: Response) {
  await handleStripeWebhook(
    stripeClient,
    stripeWebhookSecret,
    orderModel,
    req,
    res
  );
}

export default router;
