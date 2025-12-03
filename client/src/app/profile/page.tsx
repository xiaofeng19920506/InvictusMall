import {
  fetchUserServer,
  fetchShippingAddressesServer,
  fetchOrdersServer,
  ShippingAddress,
  Order,
} from "@/lib/server-api";
import { User } from "@/models/User";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Header from "@/components/common/Header";
import ProfileSidebar from "./components/ProfileSidebar";
import AccountInformation from "./components/AccountInformation";
import EditProfile from "./components/EditProfile";
import ChangePasswordForm from "./components/ChangePasswordForm";
import ProfileAddresses from "./components/ProfileAddresses";
import ProfileOrders from "./components/ProfileOrders";
import { parseOrderStatusQuery } from "../orders/orderStatusConfig";
import type { OrderStatusTabValue } from "../orders/orderStatusConfig";
import ProfilePageWrapper from "./components/ProfilePageWrapper";
import ProfileToast from "./components/ProfileToast";
import styles from "./page.module.scss";

interface ProfileSearchParams {
  tab?: string;
  status?: string;
  message?: string;
  showAdd?: string;
  edit?: string;
  orderStatus?: string;
}

interface ProfilePageProps {
  searchParams: Promise<ProfileSearchParams>;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = await searchParams;
  const activeTab =
    (params.tab as "account" | "profile" | "password" | "addresses" | "orders") || "account";
  const feedbackStatus =
    params.status === "success" || params.status === "error"
      ? params.status
      : undefined;
  const feedbackMessage = feedbackStatus ? params.message : undefined;
  const showAddAddress = params.showAdd === "1";
  const editAddressId = params.edit ? String(params.edit) : undefined;
  const orderStatus: OrderStatusTabValue = parseOrderStatusQuery(params.orderStatus);

  const paramsWithoutFeedback = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (!value || key === "status" || key === "message") {
      return;
    }
    // For orders tab, preserve orderStatus if it exists
    if (key === "orderStatus" && activeTab !== "orders") {
      return; // Don't preserve orderStatus for non-orders tabs
    }
    paramsWithoutFeedback.set(key, value);
  });
  if (!paramsWithoutFeedback.has("tab")) {
    paramsWithoutFeedback.set("tab", activeTab === "account" ? "account" : activeTab);
  }
  // For orders tab, ensure orderStatus is set (default to "all")
  if (activeTab === "orders" && !paramsWithoutFeedback.has("orderStatus")) {
    paramsWithoutFeedback.set("orderStatus", orderStatus === "all" ? "all" : String(orderStatus));
  }
  const toastClearHref = `/profile${
    paramsWithoutFeedback.toString()
      ? `?${paramsWithoutFeedback.toString()}`
      : ""
  }`;

  const cookieStore = await cookies();

  // Build cookie header string properly
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  let user: User | null = null;
  let initialAddresses: ShippingAddress[] = [];
  let initialOrders: Order[] = [];

  try {
    const response = await fetchUserServer(cookieHeader || undefined);
    if (response.success && response.user) {
      user = response.user;
    } else {
      // If not authenticated, redirect to login
      redirect("/login");
    }
  } catch (error) {
    // Log the full error for debugging
    console.error("Failed to fetch user on server:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      cookieHeader: cookieHeader ? "Present" : "Missing",
    });
    // Redirect to login if authentication fails
    redirect("/login");
  }

  // Fetch addresses and orders if user is authenticated
  if (user) {
    try {
      const addressesResponse = await fetchShippingAddressesServer(
        cookieHeader || undefined
      );
      if (addressesResponse.success && addressesResponse.data) {
        initialAddresses = addressesResponse.data;
      }
    } catch (error) {
      // Log the error but continue - the client component can handle fetching addresses
      console.error("Failed to fetch addresses on server:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : String(error),
      });
      // Continue with empty addresses array - the client component will handle fetching
      initialAddresses = [];
    }

    // Fetch orders if user is on orders tab
    if (activeTab === "orders") {
      try {
        const ordersResponse = await fetchOrdersServer(cookieHeader || undefined, {
          status: orderStatus !== "all" ? orderStatus : undefined,
          limit: 50,
        });
        if (ordersResponse.success && ordersResponse.data) {
          initialOrders = ordersResponse.data;
        }
      } catch (error) {
        // Log the error but continue - the client component can handle fetching orders
        console.error("Failed to fetch orders on server:", error);
        initialOrders = [];
      }
    }
  }

  return (
    <ProfilePageWrapper>
      <ProfileToast
        status={feedbackStatus}
        message={feedbackMessage}
        clearHref={toastClearHref}
      />
      <Header />
      <div className={styles.pageContainer}>
        <div className={styles.layout}>
          {/* Sidebar Navigation - Server Component */}
          <ProfileSidebar activeTab={activeTab} searchParams={params} />

          {/* Main Content Area */}
          <div className={styles.content}>
            {/* Content based on active tab */}
            {activeTab === "account" && (
              <AccountInformation user={user} />
            )}
            {activeTab === "profile" && (
              <EditProfile
                initialUser={
                  user
                    ? {
                        firstName: user.firstName || "",
                        lastName: user.lastName || "",
                        phoneNumber: user.phoneNumber || "",
                        email: user.email || "",
                        avatar: user.avatar,
                      }
                    : null
                }
              />
            )}
            {activeTab === "password" && (
              <ChangePasswordForm
                status={feedbackStatus}
                message={feedbackMessage}
              />
            )}
            {activeTab === "addresses" && (
              <ProfileAddresses
                initialAddresses={initialAddresses || []}
                showAddForm={showAddAddress}
                editAddressId={editAddressId || null}
                feedbackStatus={feedbackStatus}
                feedbackMessage={feedbackMessage}
              />
            )}
            {activeTab === "orders" && (
              <ProfileOrders 
                initialOrders={initialOrders || []} 
                initialStatus={orderStatus}
              />
            )}
          </div>
        </div>
      </div>
    </ProfilePageWrapper>
  );
}
