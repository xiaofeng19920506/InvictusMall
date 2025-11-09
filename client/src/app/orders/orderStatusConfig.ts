import type { Order } from "@/lib/server-api";

export const ORDER_STATUS_VALUES = [
  "pending_payment",
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatusValue = (typeof ORDER_STATUS_VALUES)[number];
export type OrderStatusTabValue = OrderStatusValue | "all";

type OrderStatusLabelMap = Record<OrderStatusValue, string>;
type OrderStatusStyleMap = Record<OrderStatusValue, string>;

const ORDER_STATUS_LABELS: OrderStatusLabelMap = {
  pending_payment: "Pending Payment",
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const ORDER_STATUS_BADGE_STYLES: OrderStatusStyleMap = {
  pending_payment: "bg-amber-100 text-amber-800",
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export const ORDER_STATUS_FILTERS: Array<{
  value: OrderStatusTabValue;
  label: string;
}> = [
  { value: "all", label: "All Orders" },
  ...ORDER_STATUS_VALUES.map((status) => ({
    value: status,
    label: ORDER_STATUS_LABELS[status],
  })),
];

export function isOrderStatusValue(
  value: string | undefined
): value is OrderStatusValue {
  if (!value) return false;
  return (ORDER_STATUS_VALUES as readonly string[]).includes(value);
}

export function parseOrderStatusQuery(
  status: string | undefined
): OrderStatusTabValue {
  if (!status) return "all";
  return isOrderStatusValue(status) ? status : "all";
}

export function getOrderStatusLabel(status: Order["status"] | string): string {
  if (isOrderStatusValue(status)) {
    return ORDER_STATUS_LABELS[status];
  }
  return status
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getOrderStatusBadgeStyle(
  status: Order["status"] | string
): string {
  if (isOrderStatusValue(status)) {
    return ORDER_STATUS_BADGE_STYLES[status];
  }
  return "bg-gray-100 text-gray-800";
}

