"use client";

import { useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "next/navigation";
import ProfileForm from "./ProfileForm";

interface ProfileFormWrapperProps {
  initialUser: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
  } | null;
}

export default function ProfileFormWrapper({
  initialUser,
}: ProfileFormWrapperProps) {
  const { refreshUser } = useAuth();
  const searchParams = useSearchParams();
  const lastRefreshRef = useRef<string>("");
  
  // Memoize status and tab to avoid unnecessary re-renders
  const status = useMemo(() => searchParams.get("status"), [searchParams]);
  const tab = useMemo(() => searchParams.get("tab"), [searchParams]);
  
  // Create a stable key from status and tab
  const currentKey = useMemo(() => {
    return `${tab || ""}-${status || ""}`;
  }, [status, tab]);
  
  // Refresh user info when profile update is successful (only once per unique state)
  useEffect(() => {
    // Only refresh if:
    // 1. We're on the profile tab
    // 2. Status is success
    // 3. We haven't refreshed for this exact state yet
    if (tab === "profile" && status === "success" && currentKey !== lastRefreshRef.current) {
      lastRefreshRef.current = currentKey;
      refreshUser();
    }
  }, [currentKey, tab, status, refreshUser]);

  return <ProfileForm initialUser={initialUser} />;
}

