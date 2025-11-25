import { useState, useEffect } from "react";
import { type Order, transactionApi, type StoreTransaction, type StripeTransaction } from "../../../services/api";

interface UseOrderDetailDataResult {
  transactions: StoreTransaction[];
  stripeTransactions: StripeTransaction[];
  loadingTransactions: boolean;
  totalRefunded: number;
  refundedItemIds: Set<string>;
  refreshKey: number;
  refreshData: () => void;
}

export const useOrderDetailData = (
  order: Order
): UseOrderDetailDataResult => {
  const [transactions, setTransactions] = useState<StoreTransaction[]>([]);
  const [stripeTransactions, setStripeTransactions] = useState<StripeTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [totalRefunded, setTotalRefunded] = useState<number>(0);
  const [refundedItemIds, setRefundedItemIds] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = async () => {
    if (!order.id) return;
    
    setLoadingTransactions(true);
    try {
      // Load local transactions by orderId
      const localResponse = await transactionApi.getTransactions({ orderId: order.id });
      if (localResponse.success && localResponse.data) {
        setTransactions(localResponse.data);
      }

      // Load Stripe transactions by paymentIntentId if available
      if (order.paymentIntentId) {
        const stripeResponse = await transactionApi.getStripeTransactions({ 
          limit: 100,
          type: 'payment_intent'
        });
        if (stripeResponse.success && stripeResponse.data) {
          // Filter by paymentIntentId
          const filtered = stripeResponse.data.filter(
            (t: StripeTransaction) => t.id === order.paymentIntentId
          );
          setStripeTransactions(filtered);
        }
      }

      // Load refunds to calculate actual order amount and get refunded item IDs
      try {
        const { refundApi } = await import("../../../services/api");
        const refundResponse = await refundApi.getOrderRefunds(order.id);
        if (refundResponse.success && refundResponse.data) {
          const refunded = typeof refundResponse.data.totalRefunded === 'number' 
            ? refundResponse.data.totalRefunded 
            : parseFloat(String(refundResponse.data.totalRefunded || 0));
          setTotalRefunded(refunded);
          
          // Collect all refunded item IDs
          const refundedIds = new Set<string>();
          if (refundResponse.data.refunds && Array.isArray(refundResponse.data.refunds)) {
            refundResponse.data.refunds.forEach((refund: any) => {
              if (refund.itemIds && Array.isArray(refund.itemIds) && refund.itemIds.length > 0) {
                // Partial refund by items - mark specific items
                refund.itemIds.forEach((itemId: string) => {
                  refundedIds.add(itemId);
                });
              } else if (!refund.itemIds || (Array.isArray(refund.itemIds) && refund.itemIds.length === 0)) {
                // Refund without itemIds - check if it's a full refund
                const refundAmount = typeof refund.amount === 'number' ? refund.amount : parseFloat(String(refund.amount || 0));
                const orderTotal = order.totalAmount;
                // If refund amount equals or exceeds order total (within 0.01 tolerance), mark all items
                if (Math.abs(refundAmount - orderTotal) < 0.01 || refundAmount >= orderTotal) {
                  order.items.forEach((item: any) => {
                    refundedIds.add(item.id);
                  });
                }
              }
            });
          }
          setRefundedItemIds(new Set(refundedIds));
        }
      } catch (error) {
        console.error("Error loading refunds:", error);
        setTotalRefunded(0);
        setRefundedItemIds(new Set());
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [order.id, order.paymentIntentId, refreshKey]);

  const refreshData = () => {
    setRefreshKey(prev => prev + 1);
  };

  return {
    transactions,
    stripeTransactions,
    loadingTransactions,
    totalRefunded,
    refundedItemIds,
    refreshKey,
    refreshData,
  };
};

