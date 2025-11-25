import Stripe from "stripe";
import { Request, Response } from "express";
import { OrderModel } from "../../models/OrderModel";
import { finalizeStripeCheckoutSession } from "./checkoutCompletionService";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";

export async function handleStripeWebhook(
  stripeClient: Stripe | null,
  stripeWebhookSecret: string | undefined,
  orderModel: OrderModel,
  req: Request,
  res: Response
): Promise<void> {
  if (!stripeClient || !stripeWebhookSecret) {
    logger.warn(
      "Stripe webhook invoked without proper configuration. Ensure STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are set."
    );
    ApiResponseHelper.error(res, "Stripe webhook is not configured.", 500);
    return;
  }

  const signature = req.headers["stripe-signature"];
  if (!signature) {
    res.status(400).send("Missing Stripe signature header.");
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripeClient.webhooks.constructEvent(
      req.body,
      signature,
      stripeWebhookSecret
    );
  } catch (error) {
    logger.error("Stripe webhook signature verification failed", error);
    const message =
      error instanceof Error ? error.message : "Unknown signature error";
    res.status(400).send(`Webhook Error: ${message}`);
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        await finalizeStripeCheckoutSession(stripeClient, orderModel, session);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.id) {
          await orderModel.deleteOrdersByStripeSession(session.id);
        }
        break;
      }
      default:
        break;
    }

    ApiResponseHelper.success(res, { received: true });
  } catch (error) {
    logger.error("Stripe webhook processing failed", error);
    ApiResponseHelper.error(res, "Stripe webhook processing failed.", 500, error);
  }
}

