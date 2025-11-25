import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { type Order, transactionApi, returnApi, type StoreTransaction, type StripeTransaction, type OrderReturn } from "../../services/api";
import { useNotification } from "../../contexts/NotificationContext";
import RefundModal from "./RefundModal";
import ReturnModal from "./ReturnModal";
import ConfirmModal from "../../shared/components/ConfirmModal";
import TransactionDetailsModal from "./TransactionDetailsModal";
import OrderInfoSection from "./components/OrderInfoSection";
import OrderItemsSection from "./components/OrderItemsSection";
import ShippingAddressSection from "./components/ShippingAddressSection";
import PaymentInfoSection from "./components/PaymentInfoSection";
import TransactionHistorySection from "./components/TransactionHistorySection";
import { useOrderDetailData } from "./hooks/useOrderDetailData";
import { formatDate, formatCurrency, formatTime } from "./utils/orderFormatters";
import { getStatusBadgeClass, getTransactionStatusClass } from "./utils/orderStatusUtils";
import styles from "./OrderDetailModal.module.css";

export interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onOrderUpdate?: (updatedOrder: Order) => void;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, onClose, onOrderUpdate }) => {
  const { t } = useTranslation();
  const { showSuccess, showError } = useNotification();
  const [currentOrder, setCurrentOrder] = useState<Order>(order);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<StoreTransaction | StripeTransaction | null>(null);
  const [showRefundTransactionModal, setShowRefundTransactionModal] = useState(false);
  const [showTransactionDetailsModal, setShowTransactionDetailsModal] = useState(false);
  const [selectedTransactionForDetails, setSelectedTransactionForDetails] = useState<StoreTransaction | StripeTransaction | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedItemForReturn, setSelectedItemForReturn] = useState<Order["items"][0] | null>(null);
  const [orderReturns, setOrderReturns] = useState<OrderReturn[]>([]);

  // Use custom hook for data loading
  const {
    transactions,
    stripeTransactions,
    loadingTransactions,
    totalRefunded,
    refundedItemIds,
    refreshData,
  } = useOrderDetailData(currentOrder);

  // Update current order when prop changes
  useEffect(() => {
    setCurrentOrder(order);
  }, [order]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const formatStatus = (status: string) => {
    return t(`orders.status.${status}`) || status;
  };

  const handleRefundTransaction = async () => {
    if (!selectedTransaction) return;

    try {
      const isLocal = (selectedTransaction as any).source === 'local';
      if (!isLocal) {
        showError(t("transactions.refund.stripeMessage") || "Stripe refunds must be processed through the Stripe dashboard");
        setShowRefundTransactionModal(false);
        setSelectedTransaction(null);
        return;
      }

      const localTransaction = selectedTransaction as StoreTransaction;
      
      try {
        const { refundApi } = await import("../../services/api");
        const refundResponse = await refundApi.createRefund(localTransaction.orderId || currentOrder.id, {
          amount: Math.abs(localTransaction.amount),
          reason: 'requested_by_customer',
        });

        if (refundResponse.success) {
          showSuccess(t("transactions.refund.success") || "Refund processed successfully");
          
          // Reload order
          try {
            const { orderApi } = await import("../../services/api");
            const orderResponse = await orderApi.getOrderById(currentOrder.id);
            if (orderResponse.success && orderResponse.data) {
              const updatedOrder = orderResponse.data;
              setCurrentOrder(updatedOrder);
              if (onOrderUpdate) {
                onOrderUpdate(updatedOrder);
              }
              refreshData();
            }
          } catch (error) {
            console.error("Error reloading order:", error);
          }
          
          setShowRefundTransactionModal(false);
          setSelectedTransaction(null);
        } else {
          showError(refundResponse.message || t("transactions.refund.error") || "Failed to process refund");
        }
      } catch (error: any) {
        console.error("Error processing refund:", error);
        showError(error.response?.data?.message || t("transactions.refund.error") || "Failed to process refund");
      }
    } catch (error: any) {
      console.error("Error processing refund:", error);
      showError(error.response?.data?.message || t("transactions.refund.error") || "Failed to process refund");
    }
  };

  const cancelRefundTransaction = () => {
    setShowRefundTransactionModal(false);
    setSelectedTransaction(null);
  };

  const handleRefundTransactionClick = (transaction: StoreTransaction | StripeTransaction) => {
    setSelectedTransaction(transaction);
    setShowRefundTransactionModal(true);
  };

  const handleViewTransactionDetails = (transaction: StoreTransaction | StripeTransaction) => {
    setSelectedTransactionForDetails(transaction);
    setShowTransactionDetailsModal(true);
  };

  const handleRequestReturn = (item: Order["items"][0]) => {
    setSelectedItemForReturn(item);
    setShowReturnModal(true);
  };

  return (
    <div className={styles.backdropContainer}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div className={styles.dialog} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h3 className={styles.title}>
            {t("orders.modal.detailTitle") || "Order Details"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("orders.modal.close") || "Close"}
            className={styles.closeButton}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={`${styles.content} custom-scrollbar`}>
          <OrderInfoSection
            order={currentOrder}
            totalRefunded={totalRefunded}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
            getStatusBadgeClass={getStatusBadgeClass}
            formatStatus={formatStatus}
          />

          <OrderItemsSection
            order={currentOrder}
            refundedItemIds={refundedItemIds}
            orderReturns={orderReturns}
            formatCurrency={formatCurrency}
            formatTime={formatTime}
            onRequestReturn={handleRequestReturn}
          />

          <ShippingAddressSection order={currentOrder} />

          <PaymentInfoSection order={currentOrder} />

          <TransactionHistorySection
            order={currentOrder}
            transactions={transactions}
            stripeTransactions={stripeTransactions}
            loadingTransactions={loadingTransactions}
            totalRefunded={totalRefunded}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
            getTransactionStatusClass={getTransactionStatusClass}
            onRefundTransaction={handleRefundTransactionClick}
            onViewTransactionDetails={handleViewTransactionDetails}
            onProcessRefund={() => setShowRefundModal(true)}
          />

          <div className={styles.actions}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              {t("orders.modal.close") || "Close"}
            </button>
          </div>
        </div>
      </div>

      {showRefundModal && (
        <RefundModal
          orderId={currentOrder.id}
          orderTotal={currentOrder.totalAmount}
          orderItems={currentOrder.items}
          paymentIntentId={currentOrder.paymentIntentId}
          onClose={() => setShowRefundModal(false)}
          onRefundSuccess={async () => {
            setShowRefundModal(false);
            // Reload order to get updated status
            try {
              const { orderApi } = await import("../../services/api");
              const orderResponse = await orderApi.getOrderById(currentOrder.id);
              if (orderResponse.success && orderResponse.data) {
                const updatedOrder = orderResponse.data;
                setCurrentOrder(updatedOrder);
                if (onOrderUpdate) {
                  onOrderUpdate(updatedOrder);
                }
                
                refreshData();
              }
            } catch (error) {
              console.error("Error reloading order:", error);
            }
          }}
        />
      )}

      <ConfirmModal
        isOpen={showRefundTransactionModal}
        title={t("transactions.refund.confirmTitle") || "Confirm Refund"}
        message={
          selectedTransaction
            ? t("transactions.refund.confirmMessage", {
              amount: formatCurrency(Math.abs(selectedTransaction.amount), selectedTransaction.currency || 'USD'),
              id: selectedTransaction.id,
            }) || `Are you sure you want to refund ${formatCurrency(Math.abs(selectedTransaction.amount), selectedTransaction.currency || 'USD')} for transaction ${selectedTransaction.id}?`
            : ""
        }
        confirmText={t("transactions.refund.confirm") || "Confirm Refund"}
        cancelText={t("transactions.refund.cancel") || "Cancel"}
        onConfirm={handleRefundTransaction}
        onCancel={cancelRefundTransaction}
        type="danger"
      />

      {selectedTransactionForDetails && (
        <TransactionDetailsModal
          transaction={selectedTransactionForDetails}
          isOpen={showTransactionDetailsModal}
          onClose={() => {
            setShowTransactionDetailsModal(false);
            setSelectedTransactionForDetails(null);
          }}
        />
      )}

      {showReturnModal && selectedItemForReturn && (
        <ReturnModal
          orderId={currentOrder.id}
          orderItem={selectedItemForReturn}
          onClose={() => {
            setShowReturnModal(false);
            setSelectedItemForReturn(null);
          }}
          onReturnSuccess={async () => {
            setShowReturnModal(false);
            setSelectedItemForReturn(null);
            // Reload returns and order data
            try {
              const returnsResponse = await returnApi.getOrderReturns(currentOrder.id);
              if (returnsResponse.success && returnsResponse.data) {
                setOrderReturns(returnsResponse.data);
              }
              // Reload order to get updated status
              const { orderApi } = await import("../../services/api");
              const orderResponse = await orderApi.getOrderById(currentOrder.id);
              if (orderResponse.success && orderResponse.data) {
                setCurrentOrder(orderResponse.data);
                if (onOrderUpdate) {
                  onOrderUpdate(orderResponse.data);
                }
                refreshData();
              }
            } catch (error) {
              console.error("Error reloading order after return:", error);
            }
          }}
        />
      )}
    </div>
  );
};

export default OrderDetailModal;

