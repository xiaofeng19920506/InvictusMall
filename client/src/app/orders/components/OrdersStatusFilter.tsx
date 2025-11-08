"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface OrdersStatusFilterProps {
  initialStatus: string;
}

export default function OrdersStatusFilter({
  initialStatus,
}: OrdersStatusFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "all") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    router.push(`/orders?${params.toString()}`);
  };

  return (
    <div className="mb-6">
      <select
        value={initialStatus}
        onChange={(e) => handleStatusChange(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        <option value="all">All Orders</option>
        <option value="pending">Pending</option>
        <option value="processing">Processing</option>
        <option value="shipped">Shipped</option>
        <option value="delivered">Delivered</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>
  );
}


