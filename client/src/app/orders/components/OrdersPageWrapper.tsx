"use client";

import { ReactNode } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";

interface OrdersPageWrapperProps {
  children: ReactNode;
}

export default function OrdersPageWrapper({ children }: OrdersPageWrapperProps) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}


