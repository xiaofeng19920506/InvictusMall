import OrdersContent from "./components/OrdersContent";
import {
  fetchOrdersServer,
  fetchUserServer,
  Order,
} from "@/lib/server-api";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parseOrderStatusQuery } from "./orderStatusConfig";

interface OrdersPageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();

  // Build cookie header string properly
  const cookieHeader = cookieStore.getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  try {
    const userResponse = await fetchUserServer(cookieHeader || undefined);
    if (!userResponse.success || !userResponse.user) {
      redirect("/login");
    }
  } catch (error) {
    console.error("Failed to verify user on orders page:", error);
    redirect("/login");
  }

  let initialOrders: Order[] = [];
  const parsedStatus = parseOrderStatusQuery(params.status);

  try {
    const response = await fetchOrdersServer(cookieHeader || undefined, {
      status: parsedStatus !== "all" ? parsedStatus : undefined,
      limit: 50,
    });
    if (response.success) {
      initialOrders = response.data || [];
    }
  } catch (error) {
    // Log the full error for debugging
    console.error("Failed to fetch orders on server:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      cookieHeader: cookieHeader ? "Present" : "Missing",
    });
    // Continue with empty orders array - the client component will handle the error state
    initialOrders = [];
  }

  return <OrdersContent orders={initialOrders} status={parsedStatus} />;
}
