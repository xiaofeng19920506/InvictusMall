import CartContent from "./components/CartContent";
import { cookies } from "next/headers";
import {
  fetchShippingAddressesServer,
  ShippingAddress,
} from "@/lib/server-api";
import { createStripeCheckoutSessionAction } from "./actions";
import type { Metadata } from "next";
import styles from "./page.module.scss";

export const metadata: Metadata = {
  title: "Shopping Cart - Invictus Mall",
  description: "Review your shopping cart and proceed to checkout at Invictus Mall.",
  robots: {
    index: false, // Cart page should not be indexed
    follow: false,
  },
};

export default async function CartPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  let addresses: ShippingAddress[] = [];

  // Only fetch addresses if user has auth cookie (authenticated)
  const hasAuthCookie = cookieHeader?.includes("auth_token");
  
  if (hasAuthCookie) {
    try {
      const response = await fetchShippingAddressesServer(
        cookieHeader || undefined
      );
      if (response.success && Array.isArray(response.data)) {
        addresses = response.data;
      }
    } catch (error) {
      // It's fine if we can't load addresses (e.g. unauthenticated user).
      console.warn("Unable to load shipping addresses for cart:", error);
    }
  }

  return (
    <div className={styles.pageContainer}>
      <CartContent
        addresses={addresses}
        defaultAddressId={addresses.find((address) => address.isDefault)?.id}
        beginCheckout={createStripeCheckoutSessionAction}
      />
    </div>
  );
}


