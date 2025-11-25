import React from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, DollarSign, TrendingUp, TrendingDown, Eye, RotateCcw } from "lucide-react";
import { type Order, type StoreTransaction, type StripeTransaction } from "../../../services/api";
import styles from "../OrderDetailModal.module.css";

interface TransactionHistorySectionProps {
  order: Order;
  transactions: StoreTransaction[];
  stripeTransactions: StripeTransaction[];
  loadingTransactions: boolean;
  totalRefunded: number;
  formatDate: (dateString: string) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  getTransactionStatusClass: (status: string) => string;
  onRefundTransaction: (transaction: StoreTransaction | StripeTransaction) => void;
  onViewTransactionDetails: (transaction: StoreTransaction | StripeTransaction) => void;
  onProcessRefund: () => void;
}

const TransactionHistorySection: React.FC<TransactionHistorySectionProps> = ({
  order,
  transactions,
  stripeTransactions,
  loadingTransactions,
  totalRefunded,
  formatDate,
  formatCurrency,
  getTransactionStatusClass,
  onRefundTransaction,
  onViewTransactionDetails,
  onProcessRefund,
}) => {
  const { t } = useTranslation();

  // Calculate statistics
  const currency = (order.items.length > 0 && order.items[0].currency) 
    ? order.items[0].currency 
    : "USD";
  const totalSales = order.totalAmount;
  const totalRefunds = totalRefunded;
  const totalAmount = totalSales - totalRefunds;

  // Combine and sort transactions
  const allTransactions = [
    ...transactions.map(t => ({ ...t, source: 'local' as const })),
    ...stripeTransactions.map(t => ({ ...t, source: 'stripe' as const }))
  ].sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

  return (
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

          {/* Transaction List */}
          {allTransactions.length === 0 ? (
            <div className={styles.emptyTransactions}>
              <p>{t("orders.modal.noTransactions") || "No transactions found for this order"}</p>
            </div>
          ) : (
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
                                onClick={() => onRefundTransaction(transaction)}
                                className={styles.refundButton}
                                title={t("orders.modal.refundTransaction") || "Refund"}
                              >
                                <RotateCcw size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => onViewTransactionDetails(transaction)}
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
          )}
        </>
      )}

      {/* Refund Button for Order */}
      {order.paymentIntentId && order.status !== "cancelled" && (
        <div className={styles.refundSection}>
          <button
            type="button"
            onClick={onProcessRefund}
            className="btn btn-primary"
          >
            <RefreshCw className={styles.buttonIcon} />
            {t("orders.modal.processRefund") || "Process Refund"}
          </button>
        </div>
      )}
    </div>
  );
};

export default TransactionHistorySection;

