import {
  fetchUserServer,
  fetchShippingAddressesServer,
  ShippingAddress,
} from "@/lib/server-api";
import { User } from "@/models/User";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Header from "@/components/common/Header";
import ProfileNavigationTabs from "./components/ProfileNavigationTabs";
import AccountInformation from "./components/AccountInformation";
import EditProfile from "./components/EditProfile";
import ChangePasswordForm from "./components/ChangePasswordForm";
import ProfileAddresses from "./components/ProfileAddresses";
import ProfilePageWrapper from "./components/ProfilePageWrapper";
import ProfileToast from "./components/ProfileToast";
import styles from "./page.module.scss";

interface ProfileSearchParams {
  tab?: string;
  status?: string;
  message?: string;
  showAdd?: string;
  edit?: string;
}

interface ProfilePageProps {
  searchParams: Promise<ProfileSearchParams>;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = await searchParams;
  const activeTab =
    (params.tab as "profile" | "password" | "addresses") || "profile";
  const feedbackStatus =
    params.status === "success" || params.status === "error"
      ? params.status
      : undefined;
  const feedbackMessage = feedbackStatus ? params.message : undefined;
  const showAddAddress = params.showAdd === "1";
  const editAddressId = params.edit ? String(params.edit) : undefined;

  const paramsWithoutFeedback = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (!value || key === "status" || key === "message") {
      return;
    }
    paramsWithoutFeedback.set(key, value);
  });
  if (!paramsWithoutFeedback.has("tab")) {
    paramsWithoutFeedback.set("tab", activeTab);
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

  // Fetch addresses if user is authenticated
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
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>My Account</h1>
            <p className={styles.subtitle}>
              Manage your account settings and preferences
            </p>
          </div>

          {/* Navigation Tabs - Server Component */}
          <ProfileNavigationTabs activeTab={activeTab} />

          {/* Account Information - Server Component */}
          <AccountInformation user={user} />

          {/* Content based on active tab */}
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
        </div>
      </div>
    </ProfilePageWrapper>
  );
}
