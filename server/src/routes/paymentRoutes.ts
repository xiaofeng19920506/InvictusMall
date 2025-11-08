import { Router, Response } from "express";
import Stripe from "stripe";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
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

router.post(
  "/checkout-session",
  authenticateToken,
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
  authenticateToken,
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

      const shippingAddressMetadata = session.metadata?.shipping_address;
      let resolvedShippingAddress:
        | {
            streetAddress: string;
            aptNumber?: string;
            city: string;
            stateProvince: string;
            zipCode: string;
            country: string;
          }
        | undefined;

      if (shippingAddressMetadata) {
        try {
          const parsed = JSON.parse(shippingAddressMetadata);
          if (parsed && typeof parsed === "object") {
            resolvedShippingAddress = {
              streetAddress: parsed.streetAddress,
              aptNumber: parsed.aptNumber,
              city: parsed.city,
              stateProvince: parsed.stateProvince,
              zipCode: parsed.zipCode,
              country: parsed.country,
            };
          }
        } catch (error) {
          console.warn("Unable to parse shipping address metadata:", error);
        }
      }

      if (!resolvedShippingAddress && session.shipping_details?.address) {
        const address = session.shipping_details.address;
        resolvedShippingAddress = {
          streetAddress: address.line1 || "",
          aptNumber: address.line2 || undefined,
          city: address.city || "",
          stateProvince: address.state || "",
          zipCode: address.postal_code || "",
          country: address.country || "",
        };
      }

      if (
        !resolvedShippingAddress ||
        !resolvedShippingAddress.streetAddress ||
        !resolvedShippingAddress.city ||
        !resolvedShippingAddress.stateProvince ||
        !resolvedShippingAddress.zipCode ||
        !resolvedShippingAddress.country
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A valid shipping address could not be determined for this session.",
        });
      }

      const existingOrders = await orderModel.getOrdersByStripeSession(
        sessionId
      );

      const orderIds: string[] = [];

      if (existingOrders.length === 0) {
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
            metadata.storeId ||
            metadata.store_id ||
            lineItem.price?.metadata?.storeId;
          const storeName =
            metadata.storeName || metadata.store_name || "Invictus Mall Store";
          const productId =
            metadata.productId || metadata.product_id || lineItem.id;
          const productName =
            lineItem.description ||
            metadata.productName ||
            metadata.product_name ||
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

        if (itemsByStore.size === 0) {
          return res.status(400).json({
            success: false,
            message:
              "No purchasable items were found for this session. Please contact support.",
          });
        }

        for (const { storeId, storeName, items } of itemsByStore.values()) {
          const order = await orderModel.createOrder({
            userId,
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
            paymentMethod: `stripe_checkout:${sessionId}`,
            stripeSessionId: sessionId,
            status: "pending",
          });

          orderIds.push(order.id);
        }
      } else {
        const now = new Date();

        for (const order of existingOrders) {
          await orderModel.updateOrderAfterPayment(order.id, {
            status:
              order.status === "pending_payment" ? "pending" : order.status,
            paymentMethod: `stripe_checkout:${sessionId}`,
            stripeSessionId: sessionId,
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

export default router;
