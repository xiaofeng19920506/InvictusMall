import { Metadata } from "next";
import { cookies } from "next/headers";
import CheckoutSuccessClient from "./CheckoutSuccessClient";
import {
  completeCheckoutSessionServer,
  type CheckoutCompletionResponse,
} from "@/lib/server-api";

export const metadata: Metadata = {
  title: "Checkout Success | Invictus Mall",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const dynamicParams = true;

interface SuccessPageProps {
  searchParams: Promise<{ session_id?: string; payment_intent?: string; order_ids?: string }>;
}

async function getOrdersByPaymentIntent(
  paymentIntentId: string,
  cookieHeader: string | undefined
): Promise<CheckoutCompletionResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (cookieHeader && cookieHeader.trim()) {
    headers["Cookie"] = cookieHeader;
  }

  try {
    // Get orders by payment intent ID
    const response = await fetch(`${baseUrl}/api/orders?paymentIntentId=${paymentIntentId}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        success: false,
        message: "Failed to retrieve order information.",
      };
    }

    const data = await response.json();
    const orders = data.data || [];
    const orderIds = orders.map((order: any) => order.id);

    return {
      success: true,
      message: "Order completed successfully.",
      orderIds,
    };
  } catch (error) {
    console.error("Failed to get orders by payment intent:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "We were unable to retrieve your order information.",
    };
  }
}

async function finalizeCheckout(
  sessionId: string | undefined,
  paymentIntentId: string | undefined,
  orderIdsParam: string | undefined
): Promise<CheckoutCompletionResponse> {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const cookieHeader =
    allCookies.length > 0
      ? allCookies.map(({ name, value }) => `${name}=${value}`).join("; ")
      : undefined;

  // User must be authenticated to complete checkout
  const hasAuthCookie = cookieHeader?.includes("auth_token");
  
  if (!hasAuthCookie) {
    return {
      success: false,
      message: "Authentication required to complete checkout. Please log in.",
    };
  }

  // If order IDs are provided directly, use them
  if (orderIdsParam) {
    try {
      const orderIds = orderIdsParam.split(',').filter(id => id.trim());
      return {
        success: true,
        message: "Order completed successfully.",
        orderIds,
      };
    } catch (error) {
      console.error("Failed to parse order IDs:", error);
    }
  }

  // If payment intent ID is provided, get orders from it
  if (paymentIntentId) {
    return await getOrdersByPaymentIntent(paymentIntentId, cookieHeader);
  }

  // If session ID is provided, use checkout session completion
  if (sessionId) {
    try {
      return await completeCheckoutSessionServer(cookieHeader, sessionId, false);
    } catch (error) {
      console.error("Failed to finalize checkout session:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "We were unable to finalize your order at this time.",
      };
    }
  }

  return {
    success: false,
    message: "Missing checkout identifier. Please contact support.",
  };
}

export default async function CheckoutSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const params = await searchParams;
  const sessionId = params.session_id;
  const paymentIntentId = params.payment_intent;
  const orderIdsParam = params.order_ids;
  
  const completionResult = await finalizeCheckout(sessionId, paymentIntentId, orderIdsParam);
  const orderIds = completionResult.success && completionResult.orderIds
    ? completionResult.orderIds
    : [];

  return (
    <CheckoutSuccessClient
      completionResult={completionResult}
      orderIds={orderIds}
    />
  );
}

