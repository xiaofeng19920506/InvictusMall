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
  searchParams: { session_id?: string };
}

async function finalizeCheckout(
  sessionId: string | undefined
): Promise<CheckoutCompletionResponse> {
  if (!sessionId) {
    return {
      success: false,
      message: "Missing checkout session identifier.",
    };
  }

  const cookieStore = cookies();
  const serializedCookies = cookieStore.getAll();
  const cookieHeader =
    serializedCookies.length > 0
      ? serializedCookies.map(({ name, value }) => `${name}=${value}`).join("; ")
      : undefined;

  // Check if user has auth cookie - if not, try guest checkout first
  const hasAuthCookie = cookieHeader?.includes("auth_token");
  
  try {
    // Try authenticated checkout first if user has auth cookie
    if (hasAuthCookie) {
      try {
        return await completeCheckoutSessionServer(cookieHeader, sessionId, false);
      } catch (authError) {
        // If authenticated checkout fails, try guest checkout
        console.warn("Authenticated checkout failed, trying guest checkout:", authError);
        return await completeCheckoutSessionServer(cookieHeader, sessionId, true);
      }
    } else {
      // No auth cookie, try guest checkout
      return await completeCheckoutSessionServer(cookieHeader, sessionId, true);
    }
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

export default async function CheckoutSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const sessionId = searchParams.session_id;
  const completionResult = await finalizeCheckout(sessionId);
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

