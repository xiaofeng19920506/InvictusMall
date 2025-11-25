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

