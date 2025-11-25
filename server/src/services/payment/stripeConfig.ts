import Stripe from "stripe";
import { logger } from "../../utils/logger";

export function getStripeClient(): Stripe | null {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!stripeSecretKey) {
    logger.warn(
      "Stripe secret key (STRIPE_SECRET_KEY) is not configured. Payment routes will be disabled."
    );
    return null;
  }

  return new Stripe(stripeSecretKey, {
    apiVersion: "2025-02-24.acacia",
  });
}

export function getStripeWebhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET;
}

export function getAppUrl(): string {
  return (
    process.env.APP_BASE_URL ||
    process.env.CLIENT_URL ||
    "http://localhost:3000"
  );
}

