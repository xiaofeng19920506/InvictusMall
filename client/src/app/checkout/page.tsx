import { Metadata } from "next";
import { redirect } from "next/navigation";
import CheckoutContent from "./components/CheckoutContent";
import { cookies } from "next/headers";
import {
  fetchShippingAddressesServer,
  ShippingAddress,
} from "@/lib/server-api";
import { createStripeCheckoutSessionAction } from "../cart/actions";

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

  // Check if user is authenticated - redirect to login if not
  const hasAuthCookie = cookieHeader?.includes("auth_token");
  
  if (!hasAuthCookie) {
    redirect("/login?redirect=/checkout");
  }

  let addresses: ShippingAddress[] = [];

  // Fetch addresses for authenticated user
  try {
    const response = await fetchShippingAddressesServer(
      cookieHeader || undefined
    );
    if (response.success && Array.isArray(response.data)) {
      addresses = response.data;
    }
  } catch (error) {
    // Failed to load shipping addresses
  }

  return (
    <CheckoutContent
      addresses={addresses}
      defaultAddressId={addresses.find((address) => address.isDefault)?.id}
      beginCheckout={createStripeCheckoutSessionAction}
    />
  );
}

