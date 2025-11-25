import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Package, MapPin, CreditCard, Calendar, Truck, Clock, RefreshCw, DollarSign, TrendingUp, TrendingDown, Eye, RotateCcw } from "lucide-react";
import { type Order, transactionApi, type StoreTransaction, type StripeTransaction } from "../../services/api";
import { getImageUrl } from "../../shared/utils/imageUtils";
import { useNotification } from "../../contexts/NotificationContext";
import RefundModal from "./RefundModal";
import ConfirmModal from "../../shared/components/ConfirmModal";
import TransactionDetailsModal from "./TransactionDetailsModal";
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
  const [transactions, setTransactions] = useState<StoreTransaction[]>([]);
  const [stripeTransactions, setStripeTransactions] = useState<StripeTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<StoreTransaction | StripeTransaction | null>(null);
  const [showRefundTransactionModal, setShowRefundTransactionModal] = useState(false);
  const [showTransactionDetailsModal, setShowTransactionDetailsModal] = useState(false);
  const [selectedTransactionForDetails, setSelectedTransactionForDetails] = useState<StoreTransaction | StripeTransaction | null>(null);

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

  // Load transactions for this order
  useEffect(() => {
    const loadTransactions = async () => {
      if (!currentOrder.id) return;
      
      setLoadingTransactions(true);
      try {
        // Load local transactions by orderId
        const localResponse = await transactionApi.getTransactions({ orderId: currentOrder.id });
        if (localResponse.success && localResponse.data) {
          setTransactions(localResponse.data);
        }

        // Load Stripe transactions by paymentIntentId if available
        if (currentOrder.paymentIntentId) {
          const stripeResponse = await transactionApi.getStripeTransactions({ 
            limit: 100,
            type: 'payment_intent'
          });
          if (stripeResponse.success && stripeResponse.data) {
            // Filter by paymentIntentId
            const filtered = stripeResponse.data.filter(
              (t: StripeTransaction) => t.id === currentOrder.paymentIntentId
            );
            setStripeTransactions(filtered);
          }
        }
      } catch (error) {
        console.error("Error loading transactions:", error);
      } finally {
        setLoadingTransactions(false);
      }
    };

    loadTransactions();
  }, [currentOrder.id, currentOrder.paymentIntentId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusBadgeClass = (status: string) => {
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

  const formatStatus = (status: string) => {
    return t(`orders.status.${status}`) || status;
  };

  const getTransactionStatusClass = (status: string) => {
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
      
      // Use refund API instead of creating a transaction directly
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
              setCurrentOrder(orderResponse.data);
              if (onOrderUpdate) {
                onOrderUpdate(orderResponse.data);
              }
            }
          } catch (error) {
            console.error("Error reloading order:", error);
          }
          
          // Reload transactions
          const localResponse = await transactionApi.getTransactions({ orderId: currentOrder.id });
          if (localResponse.success && localResponse.data) {
            setTransactions(localResponse.data);
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
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Package className={styles.sectionIcon} />
              <h4 className={styles.sectionTitle}>
                {t("orders.modal.orderInfo") || "Order Information"}
              </h4>
            </div>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  {t("orders.modal.orderId") || "Order ID"}:
                </span>
                <code className={styles.infoValue}>{currentOrder.id}</code>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  {t("orders.modal.store") || "Store"}:
                </span>
                <span className={styles.infoValue}>{currentOrder.storeName}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  {t("orders.modal.status") || "Status"}:
                </span>
                <span
                  className={`${styles.statusBadge} ${getStatusBadgeClass(currentOrder.status)}`}
                >
                  {formatStatus(currentOrder.status)}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  {t("orders.modal.total") || "Total"}:
                </span>
                <span className={`${styles.infoValue} ${styles.totalAmount}`}>
                  {formatCurrency(currentOrder.totalAmount)}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  <Calendar className={styles.inlineIcon} />
                  {t("orders.modal.orderDate") || "Order Date"}:
                </span>
                <span className={styles.infoValue}>{formatDate(currentOrder.orderDate)}</span>
              </div>
              {currentOrder.shippedDate && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>
                    <Truck className={styles.inlineIcon} />
                    {t("orders.modal.shippedDate") || "Shipped Date"}:
                  </span>
                  <span className={styles.infoValue}>{formatDate(currentOrder.shippedDate)}</span>
                </div>
              )}
              {currentOrder.deliveredDate && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>
                    <Truck className={styles.inlineIcon} />
                    {t("orders.modal.deliveredDate") || "Delivered Date"}:
                  </span>
                  <span className={styles.infoValue}>{formatDate(currentOrder.deliveredDate)}</span>
                </div>
              )}
              {currentOrder.trackingNumber && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>
                    {t("orders.modal.trackingNumber") || "Tracking Number"}:
                  </span>
                  <code className={styles.infoValue}>{currentOrder.trackingNumber}</code>
                </div>
              )}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Package className={styles.sectionIcon} />
              <h4 className={styles.sectionTitle}>
                {t("orders.modal.items") || "Order Items"} ({currentOrder.items.length})
              </h4>
            </div>
            <div className={styles.itemsList}>
              {currentOrder.items.map((item) => (
                <div key={item.id} className={styles.itemCard}>
                  {item.productImage ? (
                    <img
                      src={getImageUrl(item.productImage)}
                      alt={item.productName}
                      className={styles.itemImage}
                    />
                  ) : (
                    <div className={styles.itemImagePlaceholder}>
                      <Package className={styles.itemImageIcon} />
                    </div>
                  )}
                  <div className={styles.itemDetails}>
                    <div className={styles.itemHeader}>
                      <h5 className={styles.itemName}>{item.productName}</h5>
                      {item.isReservation && (
                        <span className={styles.reservationBadge}>
                          {t("orders.reservation") || "Reservation"}
                        </span>
                      )}
                    </div>
                    <div className={styles.itemInfo}>
                      <span className={styles.itemQuantity}>
                        {t("orders.quantity") || "Qty"}: {item.quantity}
                      </span>
                      <span className={styles.itemPrice}>
                        {formatCurrency(item.price)} × {item.quantity} ={" "}
                        {formatCurrency(item.subtotal)}
                      </span>
                    </div>
                    {item.isReservation && item.reservationDate && item.reservationTime && (
                      <div className={styles.reservationInfo}>
                        <div className={styles.reservationRow}>
                          <Calendar className={styles.reservationIcon} />
                          <span>
                            {new Date(item.reservationDate).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <div className={styles.reservationRow}>
                          <Clock className={styles.reservationIcon} />
                          <span>{formatTime(item.reservationTime)}</span>
                        </div>
                        {item.reservationNotes && (
                          <div className={styles.reservationNotes}>
                            <strong>{t("orders.modal.notes") || "Notes"}:</strong>{" "}
                            {item.reservationNotes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.itemsTotal}>
              <span className={styles.totalLabel}>
                {t("orders.modal.total") || "Total"}:
              </span>
              <span className={styles.totalValue}>
                {formatCurrency(currentOrder.totalAmount)}
              </span>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <MapPin className={styles.sectionIcon} />
              <h4 className={styles.sectionTitle}>
                {t("orders.modal.shippingAddress") || "Shipping Address"}
              </h4>
            </div>
            <div className={styles.address}>
              <p>{currentOrder.shippingAddress.streetAddress}</p>
              {currentOrder.shippingAddress.aptNumber && (
                <p>{currentOrder.shippingAddress.aptNumber}</p>
              )}
              <p>
                {currentOrder.shippingAddress.city}, {currentOrder.shippingAddress.stateProvince}{" "}
                {currentOrder.shippingAddress.zipCode}
              </p>
              <p>{currentOrder.shippingAddress.country}</p>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <CreditCard className={styles.sectionIcon} />
              <h4 className={styles.sectionTitle}>
                {t("orders.modal.paymentInfo") || "Payment Information"}
              </h4>
            </div>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  {t("orders.modal.paymentMethod") || "Payment Method"}:
                </span>
                <span className={styles.infoValue}>{currentOrder.paymentMethod}</span>
              </div>
            </div>
          </div>

          {/* Transaction History Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <DollarSign className={styles.sectionIcon} />
              <h4 className={styles.sectionTitle}>
                {t("orders.modal.transactions") || "Transaction History"}
              </h4>
            </div>

            {loadingTransactions ? (
              <div className={styles.loading}>
                <RefreshCw className={styles.spinning} />
                <p>{t("orders.modal.loadingTransactions") || "Loading transactions..."}</p>
              </div>
            ) : (
              <>
                {/* Transaction Statistics */}
                {(() => {
                  const allTransactions = [
                    ...transactions.map(t => ({ ...t, source: 'local' as const })),
                    ...stripeTransactions.map(t => ({ ...t, source: 'stripe' as const }))
                  ];
                  
                  // Get currency from first transaction or default to USD
                  const currency = allTransactions.length > 0 
                    ? (allTransactions[0].currency || "USD")
                    : "USD";
                  
                  const totalAmount = allTransactions
                    .filter(t => t.status === 'completed')
                    .reduce((sum, t) => {
                      const isRefund = t.transactionType === 'refund' || (t.amount < 0);
                      return sum + (isRefund ? -Math.abs(t.amount) : Math.abs(t.amount));
                    }, 0);

                  const totalSales = allTransactions
                    .filter(t => (t.transactionType === 'sale' || !t.transactionType || t.transactionType === 'payment') && t.status === 'completed' && t.amount > 0)
                    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

                  const totalRefunds = allTransactions
                    .filter(t => (t.transactionType === 'refund' || t.amount < 0) && t.status === 'completed')
                    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

                  return (
                    <div className={styles.transactionStats}>
                      <div className={styles.statCard}>
                        <DollarSign className={styles.statIcon} />
                        <div>
                          <div className={styles.statLabel}>{t("orders.modal.totalAmount") || "Total Amount"}</div>
                          <div className={styles.statValue}>{formatCurrency(totalAmount, currency)}</div>
                        </div>
                      </div>
                      <div className={styles.statCard}>
                        <TrendingUp className={styles.statIcon} />
                        <div>
                          <div className={styles.statLabel}>{t("orders.modal.totalSales") || "Total Sales"}</div>
                          <div className={styles.statValue}>{formatCurrency(totalSales, currency)}</div>
                        </div>
                      </div>
                      <div className={styles.statCard}>
                        <TrendingDown className={styles.statIcon} />
                        <div>
                          <div className={styles.statLabel}>{t("orders.modal.totalRefunds") || "Total Refunds"}</div>
                          <div className={styles.statValue}>{formatCurrency(totalRefunds, currency)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Transaction List */}
                {(() => {
                  const allTransactions = [
                    ...transactions.map(t => ({ ...t, source: 'local' as const })),
                    ...stripeTransactions.map(t => ({ ...t, source: 'stripe' as const }))
                  ].sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

                  if (allTransactions.length === 0) {
                    return (
                      <div className={styles.emptyTransactions}>
                        <p>{t("orders.modal.noTransactions") || "No transactions found for this order"}</p>
                      </div>
                    );
                  }

                  return (
                    <div className={styles.transactionsTable}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>{t("orders.modal.transactionDate") || "Date"}</th>
                            <th>{t("orders.modal.transactionType") || "Type"}</th>
                            <th>{t("orders.modal.transactionAmount") || "Amount"}</th>
                            <th>{t("orders.modal.transactionStatus") || "Status"}</th>
                            <th>{t("orders.modal.transactionActions") || "Actions"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allTransactions.map((transaction) => {
                            const isLocal = (transaction as any).source === 'local';
                            const transactionType = transaction.transactionType || (isLocal ? 'sale' : 'payment');
                            const isRefund = transactionType === "refund" || (transaction.amount < 0 && !isLocal);

                            return (
                              <tr key={`${(transaction as any).source}-${transaction.id}`}>
                                <td>{formatDate(transaction.transactionDate)}</td>
                                <td>
                                  <span className={styles.transactionType}>
                                    {isLocal 
                                      ? t("transactions.source.local") || "Local" 
                                      : t("transactions.source.stripe") || "Stripe"} - {t(`transactions.type.${transactionType}`) || transactionType}
                                  </span>
                                </td>
                                <td className={isRefund ? styles.negativeAmount : styles.positiveAmount}>
                                  {isRefund ? "-" : "+"}
                                  {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
                                </td>
                                <td>
                                  <span className={`${styles.statusBadge} ${getTransactionStatusClass(transaction.status)}`}>
                                    {t(`transactions.statuses.${transaction.status}`) || transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                                  </span>
                                </td>
                                <td>
                                  <div className={styles.transactionActions}>
                                    {!isRefund && transaction.status === 'completed' && isLocal && (
                                      <button
                                        onClick={() => {
                                          setSelectedTransaction(transaction);
                                          setShowRefundTransactionModal(true);
                                        }}
                                        className={styles.refundButton}
                                        title={t("orders.modal.refundTransaction") || "Refund"}
                                      >
                                        <RotateCcw size={16} />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        setSelectedTransactionForDetails(transaction);
                                        setShowTransactionDetailsModal(true);
                                      }}
                                      className={styles.viewButton}
                                      title={t("orders.modal.viewDetails") || "View Details"}
                                    >
                                      <Eye size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </>
            )}

            {/* Refund Button for Order */}
            {currentOrder.paymentIntentId && currentOrder.status !== "cancelled" && (
              <div className={styles.refundSection}>
                <button
                  type="button"
                  onClick={() => setShowRefundModal(true)}
                  className="btn btn-primary"
                >
                  <RefreshCw className={styles.buttonIcon} />
                  {t("orders.modal.processRefund") || "Process Refund"}
                </button>
              </div>
            )}
          </div>

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
          onClose={() => setShowRefundModal(false)}
          onRefundSuccess={async () => {
            setShowRefundModal(false);
            // Reload order to get updated status
            try {
              const { orderApi } = await import("../../services/api");
              const orderResponse = await orderApi.getOrderById(currentOrder.id);
              if (orderResponse.success && orderResponse.data) {
                setCurrentOrder(orderResponse.data);
                if (onOrderUpdate) {
                  onOrderUpdate(orderResponse.data);
                }
              }
            } catch (error) {
              console.error("Error reloading order:", error);
            }
            // Reload transactions
            const reloadTransactions = async () => {
              try {
                const localResponse = await transactionApi.getTransactions({ orderId: currentOrder.id });
                if (localResponse.success && localResponse.data) {
                  setTransactions(localResponse.data);
                }
                if (currentOrder.paymentIntentId) {
                  const stripeResponse = await transactionApi.getStripeTransactions({ 
                    limit: 100,
                    type: 'payment_intent'
                  });
                  if (stripeResponse.success && stripeResponse.data) {
                    const filtered = stripeResponse.data.filter(
                      (t: StripeTransaction) => t.id === currentOrder.paymentIntentId
                    );
                    setStripeTransactions(filtered);
                  }
                }
              } catch (error) {
                console.error("Error reloading transactions:", error);
              }
            };
            reloadTransactions();
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
    </div>
  );
};

export default OrderDetailModal;

