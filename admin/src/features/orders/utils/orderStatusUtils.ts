import styles from "../OrderDetailModal.module.css";

export const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case "pending_payment":
      return styles.statusPendingPayment;
    case "pending":
      return styles.statusPending;
    case "processing":
      return styles.statusProcessing;
    case "shipped":
      return styles.statusShipped;
    case "delivered":
      return styles.statusDelivered;
    case "cancelled":
      return styles.statusCancelled;
    default:
      return "";
  }
};

export const getTransactionStatusClass = (status: string): string => {
  switch (status) {
    case "completed":
      return styles.statusCompleted;
    case "pending":
      return styles.statusPending;
    case "failed":
      return styles.statusFailed;
    case "cancelled":
      return styles.statusCancelled;
    case "refunded":
      return styles.statusRefunded;
    default:
      return "";
  }
};

