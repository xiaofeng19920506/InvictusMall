import Stripe from "stripe";
import { OrderModel } from "../../models/OrderModel";
import { resolveShippingAddressFromSession } from "./shippingAddressResolver";
import { fetchItemsGroupedByStore } from "./checkoutItemService";
import { CheckoutFinalizationError } from "./types";

export async function finalizeStripeCheckoutSession(
  stripeClient: Stripe | null,
  orderModel: OrderModel,
  session: Stripe.Checkout.Session,
  options: { expectedUserId?: string } = {}
): Promise<string[]> {
  if (!stripeClient) {
    throw new CheckoutFinalizationError(
      "Stripe is not configured. Please contact support.",
      500
    );
  }

  const metadataUserId = session.metadata?.userId;
  const isGuest = session.metadata?.isGuest === "true";
  
  if (!metadataUserId) {
    throw new CheckoutFinalizationError(
      "Checkout session is missing user information.",
      400
    );
  }

  // For authenticated users, verify the userId matches
  if (!isGuest && options.expectedUserId && metadataUserId !== options.expectedUserId) {
    throw new CheckoutFinalizationError(
      "You do not have permission to finalize this order.",
      403
    );
  }

  if (session.payment_status !== "paid") {
    throw new CheckoutFinalizationError(
      "Payment has not been completed for this session. Please try again after payment is confirmed.",
      400
    );
  }

  const resolvedShippingAddress = resolveShippingAddressFromSession(session);

  if (
    !resolvedShippingAddress ||
    !resolvedShippingAddress.streetAddress ||
    !resolvedShippingAddress.city ||
    !resolvedShippingAddress.stateProvince ||
    !resolvedShippingAddress.zipCode ||
    !resolvedShippingAddress.country
  ) {
    throw new CheckoutFinalizationError(
      "A valid shipping address could not be determined for this session.",
      400
    );
  }

  const existingOrders = await orderModel.getOrdersByStripeSession(session.id);
  const orderIds: string[] = [];
  const now = new Date();

  if (existingOrders.length > 0) {
    for (const order of existingOrders) {
      await orderModel.updateOrderAfterPayment(order.id, {
        status:
          order.status,
        paymentMethod: `stripe_checkout:${session.id}`,
        stripeSessionId: session.id,
        orderDate: now,
        shippingAddress: {
          streetAddress: resolvedShippingAddress.streetAddress,
          aptNumber: resolvedShippingAddress.aptNumber,
          city: resolvedShippingAddress.city,
          stateProvince: resolvedShippingAddress.stateProvince,
          zipCode: resolvedShippingAddress.zipCode,
          country: resolvedShippingAddress.country,
        },
      });

      orderIds.push(order.id);
    }
  } else {
    const itemsByStore = await fetchItemsGroupedByStore(stripeClient, session.id);

    if (itemsByStore.size === 0) {
      throw new CheckoutFinalizationError(
        "No purchasable items were found for this session. Please contact support.",
        400
      );
    }

    // Get guest information from metadata if it's a guest order
    const guestEmail = session.metadata?.guestEmail;
    const guestFullName = session.metadata?.guestFullName;
    const guestPhoneNumber = session.metadata?.guestPhoneNumber;

    for (const { storeId, storeName, items } of itemsByStore.values()) {
      const order = await orderModel.createOrder({
        userId: isGuest ? null : metadataUserId,
        storeId,
        storeName,
        items,
        shippingAddress: {
          streetAddress: resolvedShippingAddress.streetAddress,
          aptNumber: resolvedShippingAddress.aptNumber,
          city: resolvedShippingAddress.city,
          stateProvince: resolvedShippingAddress.stateProvince,
          zipCode: resolvedShippingAddress.zipCode,
          country: resolvedShippingAddress.country,
        },
        paymentMethod: `stripe_checkout:${session.id}`,
        stripeSessionId: session.id,
        status: "processing",
        guestEmail: isGuest ? guestEmail : null,
        guestFullName: isGuest ? guestFullName : null,
        guestPhoneNumber: isGuest ? guestPhoneNumber : null,
      });

      orderIds.push(order.id);
    }
  }

  return orderIds;
}

