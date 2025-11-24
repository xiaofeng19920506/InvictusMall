import { Metadata } from "next";
import CheckoutContent from "./components/CheckoutContent";
import { cookies } from "next/headers";
import {
  fetchShippingAddressesServer,
  ShippingAddress,
} from "@/lib/server-api";
import { createStripeCheckoutSessionAction, createGuestCheckoutSessionAction } from "../cart/actions";

export const metadata: Metadata = {
  title: "Checkout | Invictus Mall",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CheckoutPage() {
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
      console.warn("Unable to load shipping addresses for checkout:", error);
    }
  }

  return (
    <CheckoutContent
      addresses={addresses}
      defaultAddressId={addresses.find((address) => address.isDefault)?.id}
      beginCheckout={createStripeCheckoutSessionAction}
      beginGuestCheckout={createGuestCheckoutSessionAction}
    />
  );
}

