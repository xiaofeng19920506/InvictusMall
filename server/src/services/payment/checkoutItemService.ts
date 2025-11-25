import Stripe from "stripe";
import { CheckoutFinalizationError } from "./types";
import { PendingOrderGroup } from "./types";

export async function fetchItemsGroupedByStore(
  stripeClient: Stripe | null,
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

