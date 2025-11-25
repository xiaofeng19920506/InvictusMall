import Stripe from "stripe";
import { CheckoutPayload, PendingOrderGroup } from "./types";

export function buildLineItems(items: CheckoutPayload["items"]) {
  return items.map((item) => {
    const rawImage =
      typeof item.productImage === "string" ? item.productImage.trim() : "";
    const isAbsoluteImage =
      rawImage.startsWith("http://") || rawImage.startsWith("https://");

    return {
      quantity: item.quantity,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(item.price * 100),
        product_data: {
          name: item.productName,
          metadata: {
            productId: item.productId,
            storeId: item.storeId,
            storeName: item.storeName,
            productName: item.productName,
          },
          ...(isAbsoluteImage
            ? {
                images: [rawImage],
              }
            : {}),
        },
      },
    };
  });
}

export async function createCheckoutSession(
  stripeClient: Stripe,
  lineItems: ReturnType<typeof buildLineItems>,
  customerId: string,
  metadata: Record<string, string>,
  appUrl: string
): Promise<Stripe.Checkout.Session> {
  return await stripeClient.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    automatic_tax: { enabled: false },
    billing_address_collection: "required",
    shipping_address_collection: {
      allowed_countries: ["US", "CA"],
    },
    customer: customerId,
    success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/cart?canceled=1`,
    metadata,
  });
}

export async function preparePendingOrders(
  orderModel: any,
  itemsByStore: Map<string, PendingOrderGroup>,
  sessionId: string,
  userId: string,
  shippingAddress: {
    streetAddress: string;
    aptNumber?: string;
    city: string;
    stateProvince: string;
    zipCode: string;
    country: string;
  }
): Promise<void> {
  await orderModel.deleteOrdersByStripeSession(sessionId);

  for (const { storeId, storeName, items } of itemsByStore.values()) {
    await orderModel.createOrder({
      userId,
      storeId,
      storeName,
      items,
      shippingAddress,
      paymentMethod: "stripe_checkout:pending",
      stripeSessionId: sessionId,
      status: "pending_payment",
    });
  }
}

export async function cleanupFailedCheckout(
  stripeClient: Stripe,
  orderModel: any,
  sessionId: string,
  logger: any
): Promise<void> {
  try {
    await orderModel.deleteOrdersByStripeSession(sessionId);
  } catch (cleanupError) {
    logger.warn("Unable to clean up staged orders after failure", {
      sessionId,
      cleanupError,
    });
  }

  try {
    await stripeClient.checkout.sessions.expire(sessionId);
  } catch (expireError) {
    logger.warn(
      "Unable to expire Stripe checkout session after failure",
      { sessionId, expireError }
    );
  }
}

