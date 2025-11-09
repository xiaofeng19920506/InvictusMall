import { Router, Response, Request } from "express";
import Stripe from "stripe";
import {
  authenticateUserToken,
  AuthenticatedRequest,
} from "../middleware/auth";
import { ShippingAddressModel } from "../models/ShippingAddressModel";
import { OrderModel } from "../models/OrderModel";
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
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

interface CheckoutItem {
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  price: number;
  storeId: string;
  storeName: string;
}

interface CheckoutPayload {
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

interface PendingOrderItem {
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  price: number;
}

interface PendingOrderGroup {
  storeId: string;
  storeName: string;
  items: PendingOrderItem[];
}

type ResolvedShippingAddress = {
  streetAddress: string;
  aptNumber?: string;
  city: string;
  stateProvince: string;
  zipCode: string;
  country: string;
};

class CheckoutFinalizationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "CheckoutFinalizationError";
    this.statusCode = statusCode;
  }
}

function resolveShippingAddressFromSession(
  session: Stripe.Checkout.Session
): ResolvedShippingAddress | undefined {
  const metadataAddress = session.metadata?.shipping_address;

  if (metadataAddress) {
    try {
      const parsed = JSON.parse(metadataAddress);
      if (parsed && typeof parsed === "object") {
        const streetAddress =
          parsed.streetAddress || parsed.street_address || "";
        const city = parsed.city || "";
        const stateProvince =
          parsed.stateProvince || parsed.state_province || "";
        const zipCode = parsed.zipCode || parsed.zip_code || "";
        const country = parsed.country || "";

        if (streetAddress && city && stateProvince && zipCode && country) {
          return {
            streetAddress,
            aptNumber: parsed.aptNumber || parsed.apt_number || undefined,
            city,
            stateProvince,
            zipCode,
            country,
          };
        }
      }
    } catch (error) {
      console.warn("Unable to parse shipping address metadata:", error);
    }
  }

  const shippingDetails = session.shipping_details?.address;
  if (shippingDetails) {
    const streetAddress = shippingDetails.line1 || "";
    const city = shippingDetails.city || "";
    const stateProvince = shippingDetails.state || "";
    const zipCode = shippingDetails.postal_code || "";
    const country = shippingDetails.country || "";

    if (streetAddress && city && stateProvince && zipCode && country) {
      return {
        streetAddress,
        aptNumber: shippingDetails.line2 || undefined,
        city,
        stateProvince,
        zipCode,
        country,
      };
    }
  }

  return undefined;
}

async function fetchItemsGroupedByStore(
  sessionId: string
): Promise<Map<string, PendingOrderGroup>> {
  if (!stripeClient) {
    throw new CheckoutFinalizationError(
      "Stripe is not configured. Please contact support.",
      500
    );
  }

  const lineItems = await stripeClient.checkout.sessions.listLineItems(
    sessionId,
    {
      limit: 100,
      expand: ["data.price.product"],
    }
  );

  const itemsByStore = new Map<string, PendingOrderGroup>();

  for (const lineItem of lineItems.data) {
    const quantity = lineItem.quantity ?? 0;
    if (quantity <= 0) {
      continue;
    }

    const price = lineItem.price;
    const product =
      price && price.product && typeof price.product !== "string"
        ? (price.product as Stripe.Product | Stripe.DeletedProduct)
        : undefined;
    const metadata =
      product && "metadata" in product && product.metadata
        ? product.metadata
        : {};

    const storeId =
      (metadata.storeId as string) ||
      (metadata.store_id as string) ||
      lineItem.price?.metadata?.storeId;
    const storeName =
      (metadata.storeName as string) ||
      (metadata.store_name as string) ||
      "Invictus Mall Store";
    const productId =
      (metadata.productId as string) ||
      (metadata.product_id as string) ||
      lineItem.id;
    const productName =
      lineItem.description ||
      (metadata.productName as string) ||
      (metadata.product_name as string) ||
      "Product";

    const productImage =
      product &&
      "images" in product &&
      Array.isArray(product.images) &&
      product.images.length > 0
        ? product.images[0]
        : undefined;

    const unitAmountCents = price?.unit_amount ?? 0;
    const unitPrice = unitAmountCents / 100;

    if (!storeId || unitPrice <= 0) {
      continue;
    }

    if (!itemsByStore.has(storeId)) {
      itemsByStore.set(storeId, {
        storeId,
        storeName,
        items: [],
      });
    }

    itemsByStore.get(storeId)!.items.push({
      productId,
      productName,
      productImage,
      quantity,
      price: unitPrice,
    });
  }

  return itemsByStore;
}

async function finalizeStripeCheckoutSession(
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
  if (!metadataUserId) {
    throw new CheckoutFinalizationError(
      "Checkout session is missing user information.",
      400
    );
  }

  if (options.expectedUserId && metadataUserId !== options.expectedUserId) {
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
          order.status === "pending_payment" ? "pending" : order.status,
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
    const itemsByStore = await fetchItemsGroupedByStore(session.id);

    if (itemsByStore.size === 0) {
      throw new CheckoutFinalizationError(
        "No purchasable items were found for this session. Please contact support.",
        400
      );
    }

    for (const { storeId, storeName, items } of itemsByStore.values()) {
      const order = await orderModel.createOrder({
        userId: metadataUserId,
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
      });

      orderIds.push(order.id);
    }
  }

  return orderIds;
}

router.post(
  "/checkout-session",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!stripeClient) {
        return res.status(500).json({
          success: false,
          message: "Stripe is not configured. Please contact support.",
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { items, shippingAddressId, newShippingAddress, saveNewAddress } =
        req.body as CheckoutPayload;

      const userEmail = req.user?.email;
      if (!userEmail) {
        return res.status(400).json({
          success: false,
          message: "User email is required to start checkout.",
        });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Your cart is empty.",
        });
      }

      const sanitizedItems = items
        .map((item) => ({
          ...item,
          quantity: Number(item.quantity) || 0,
          price: Number(item.price) || 0,
          productImage:
            typeof item.productImage === "string" && item.productImage.trim()
              ? item.productImage.trim()
              : undefined,
        }))
        .filter((item) => item.quantity > 0 && item.price > 0);

      if (sanitizedItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: "All items in your cart have invalid quantities or prices.",
        });
      }

      const itemsByStore = new Map<string, PendingOrderGroup>();

      for (const item of sanitizedItems) {
        if (!itemsByStore.has(item.storeId)) {
          itemsByStore.set(item.storeId, {
            storeId: item.storeId,
            storeName: item.storeName,
            items: [],
          });
        }

        itemsByStore.get(item.storeId)!.items.push({
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage,
          quantity: item.quantity,
          price: item.price,
        });
      }

      let shippingAddress: CheckoutPayload["newShippingAddress"] | undefined;

      if (shippingAddressId) {
        try {
          const existingAddress = await shippingAddressModel.getAddressById(
            shippingAddressId
          );
          if (existingAddress.userId !== userId) {
            return res.status(403).json({
              success: false,
              message: "Selected shipping address does not belong to the user.",
            });
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
          return res.status(404).json({
            success: false,
            message: "Selected shipping address could not be found.",
          });
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
          return res.status(400).json({
            success: false,
            message: "Please complete all required shipping address fields.",
          });
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
            console.error("Failed to save shipping address:", error);
            return res.status(500).json({
              success: false,
              message: "Failed to save shipping address.",
            });
          }
        }
      } else {
        return res.status(400).json({
          success: false,
          message: "Please select or provide a shipping address.",
        });
      }

      const appUrl =
        process.env.APP_BASE_URL ||
        process.env.CLIENT_URL ||
        "http://localhost:3000";

      const lineItems = sanitizedItems.map((item) => {
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

      const resolvedShippingAddress = shippingAddress;

      const persistedShippingAddress = {
        streetAddress: shippingAddress.streetAddress,
        aptNumber: shippingAddress.aptNumber,
        city: shippingAddress.city,
        stateProvince: shippingAddress.stateProvince,
        zipCode: shippingAddress.zipCode,
        country: shippingAddress.country,
      };

      if (!resolvedShippingAddress) {
        return res.status(500).json({
          success: false,
          message: "Unable to resolve shipping address for checkout session.",
        });
      }

      let customerId: string | undefined;
      const existingCustomers = await stripeClient.customers.list({
        email: userEmail,
        limit: 1,
      });

      const existingCustomer = existingCustomers.data[0];

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const createdCustomer = await stripeClient.customers.create({
          email: userEmail,
          name: resolvedShippingAddress.fullName,
        });
        customerId = createdCustomer.id;
      }

      const session = await stripeClient.checkout.sessions.create({
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
        metadata: {
          userId,
          save_new_address: saveNewAddress ? "true" : "false",
          shipping_address: JSON.stringify(resolvedShippingAddress),
          item_count: String(
            sanitizedItems.reduce(
              (count, item) => count + Math.max(0, item.quantity),
              0
            )
          ),
          store_count: String(
            new Set(sanitizedItems.map((item) => item.storeId)).size
          ),
        },
      });

      if (!session.url) {
        return res.status(500).json({
          success: false,
          message:
            "Stripe checkout session was created without a redirect URL. Please try again.",
        });
      }

      try {
        await orderModel.deleteOrdersByStripeSession(session.id);

        for (const { storeId, storeName, items } of itemsByStore.values()) {
          await orderModel.createOrder({
            userId,
            storeId,
            storeName,
            items,
            shippingAddress: persistedShippingAddress,
            paymentMethod: "stripe_checkout:pending",
            stripeSessionId: session.id,
            status: "pending_payment",
          });
        }
      } catch (error) {
        console.error(
          "Failed to prepare pending orders for checkout session:",
          error
        );

        try {
          await orderModel.deleteOrdersByStripeSession(session.id);
        } catch (cleanupError) {
          console.warn(
            "Unable to clean up staged orders after failure:",
            cleanupError
          );
        }

        try {
          await stripeClient.checkout.sessions.expire(session.id);
        } catch (expireError) {
          console.warn(
            "Unable to expire Stripe checkout session after failure:",
            expireError
          );
        }

        return res.status(500).json({
          success: false,
          message:
            "Unable to prepare your checkout session. Please try again in a moment.",
        });
      }

      return res.json({
        success: true,
        checkoutUrl: session.url,
      });
    } catch (error) {
      console.error("Failed to create Stripe checkout session:", error);
      return res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to start Stripe checkout. Please try again.",
      });
    }
  }
);

router.post(
  "/checkout-complete",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!stripeClient) {
        return res.status(500).json({
          success: false,
          message: "Stripe is not configured. Please contact support.",
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { sessionId } = req.body as { sessionId?: string };

      if (!sessionId || typeof sessionId !== "string") {
        return res.status(400).json({
          success: false,
          message: "A valid Stripe checkout session ID is required.",
        });
      }

      const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
        expand: ["customer"],
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Checkout session not found.",
        });
      }

      if (session.metadata?.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to finalize this order.",
        });
      }

      if (session.payment_status !== "paid") {
        return res.status(400).json({
          success: false,
          message:
            "Payment has not been completed for this session. Please try again after payment is confirmed.",
        });
      }

      let orderIds: string[] = [];
      try {
        orderIds = await finalizeStripeCheckoutSession(session, {
          expectedUserId: userId,
        });
      } catch (error) {
        if (error instanceof CheckoutFinalizationError) {
          return res.status(error.statusCode).json({
            success: false,
            message: error.message,
          });
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
        console.warn(
          "Unable to update Stripe checkout session metadata:",
          updateError
        );
      }

      return res.json({
        success: true,
        message: "Order has been recorded successfully.",
        orderIds,
      });
    } catch (error) {
      console.error("Failed to finalize Stripe checkout session:", error);
      return res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to finalize checkout session. Please contact support.",
      });
    }
  }
);

export async function stripeWebhookHandler(req: Request, res: Response) {
  if (!stripeClient || !stripeWebhookSecret) {
    console.warn(
      "Stripe webhook invoked without proper configuration. Ensure STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are set."
    );
    return res.status(500).json({
      success: false,
      message: "Stripe webhook is not configured.",
    });
  }

  const signature = req.headers["stripe-signature"];
  if (!signature) {
    return res.status(400).send("Missing Stripe signature header.");
  }

  let event: Stripe.Event;

  try {
    event = stripeClient.webhooks.constructEvent(
      req.body,
      signature,
      stripeWebhookSecret
    );
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    const message =
      error instanceof Error ? error.message : "Unknown signature error";
    return res.status(400).send(`Webhook Error: ${message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        await finalizeStripeCheckoutSession(session);
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

    return res.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed:", error);
    return res.status(500).json({
      success: false,
      message: "Stripe webhook processing failed.",
    });
  }
}

export default router;
