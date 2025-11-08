import CartContent from "./components/CartContent";
import { cookies } from "next/headers";
import {
  fetchShippingAddressesServer,
  ShippingAddress,
} from "@/lib/server-api";
import { createStripeCheckoutSessionAction } from "./actions";

export default async function CartPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  let addresses: ShippingAddress[] = [];

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

  return (
    <div className="min-h-screen bg-gray-50">
      <CartContent
        addresses={addresses}
        defaultAddressId={addresses.find((address) => address.isDefault)?.id}
        beginCheckout={createStripeCheckoutSessionAction}
      />
    </div>
  );
}


