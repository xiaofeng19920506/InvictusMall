import React from "react";
import { useTranslation } from "react-i18next";
import { X, CreditCard, Calendar, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import type { StoreTransaction, StripeTransaction } from "../../services/api";
import styles from "./TransactionDetailsModal.module.css";

export interface TransactionDetailsModalProps {
  transaction: StoreTransaction | StripeTransaction;
  isOpen: boolean;
  onClose: () => void;
}

const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
  transaction,
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const isLocal = (transaction as any).source === 'local';
  const localTransaction = isLocal ? transaction as StoreTransaction : null;
  const stripeTransaction = !isLocal ? transaction as StripeTransaction : null;

  const formatCurrency = (amount: number, currency: string = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "succeeded":
        return <CheckCircle className={styles.statusIcon} style={{ color: "#10b981" }} />;
      case "pending":
      case "processing":
        return <Clock className={styles.statusIcon} style={{ color: "#f59e0b" }} />;
      case "failed":
      case "canceled":
      case "cancelled":
        return <XCircle className={styles.statusIcon} style={{ color: "#ef4444" }} />;
      default:
        return <AlertCircle className={styles.statusIcon} style={{ color: "#6b7280" }} />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "succeeded":
        return styles.statusCompleted;
      case "pending":
      case "processing":
        return styles.statusPending;
      case "failed":
      case "canceled":
      case "cancelled":
        return styles.statusFailed;
      default:
        return styles.statusUnknown;
    }
  };

  return (
    <div className={styles.backdropContainer}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div className={styles.dialog} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <CreditCard className={styles.headerIcon} />
            <h3 className={styles.title}>
              {t("orders.modal.transactionDetails.title") || "Transaction Details"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label={t("common.close") || "Close"}
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          {/* Transaction Overview */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>
              {t("orders.modal.transactionDetails.overview") || "Overview"}
            </h4>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  {t("orders.modal.transactionDetails.id") || "Transaction ID"}:
                </span>
                <span className={styles.infoValue}>{transaction.id}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  {t("orders.modal.transactionDetails.type") || "Type"}:
                </span>
                <span className={styles.infoValue}>
                  {isLocal
                    ? t("transactions.source.local") || "Local"
                    : t("transactions.source.stripe") || "Stripe"} - {t(`transactions.type.${transaction.transactionType || 'payment'}`) || transaction.transactionType || 'Payment'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  {t("orders.modal.transactionDetails.amount") || "Amount"}:
                </span>
                <span className={`${styles.infoValue} ${transaction.amount < 0 ? styles.negativeAmount : styles.positiveAmount}`}>
                  {transaction.amount < 0 ? "-" : "+"}
                  {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  {t("orders.modal.transactionDetails.status") || "Status"}:
                </span>
                <span className={`${styles.statusBadge} ${getStatusClass(transaction.status)}`}>
                  {getStatusIcon(transaction.status)}
                  {t(`transactions.statuses.${transaction.status}`) || transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  <Calendar className={styles.icon} size={16} />
                  {t("orders.modal.transactionDetails.date") || "Date"}:
                </span>
                <span className={styles.infoValue}>
                  {formatDate(transaction.transactionDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Local Transaction Details */}
          {localTransaction && (
            <>
              <div className={styles.section}>
                <h4 className={styles.sectionTitle}>
                  {t("orders.modal.transactionDetails.localDetails") || "Local Transaction Details"}
                </h4>
                <div className={styles.infoGrid}>
                  {localTransaction.orderId && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>
                        {t("orders.modal.transactionDetails.orderId") || "Order ID"}:
                      </span>
                      <span className={styles.infoValue}>{localTransaction.orderId}</span>
                    </div>
                  )}
                  {localTransaction.storeId && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>
                        {t("orders.modal.transactionDetails.storeId") || "Store ID"}:
                      </span>
                      <span className={styles.infoValue}>{localTransaction.storeId}</span>
                    </div>
                  )}
                  {localTransaction.paymentMethod && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>
                        {t("orders.modal.transactionDetails.paymentMethod") || "Payment Method"}:
                      </span>
                      <span className={styles.infoValue}>{localTransaction.paymentMethod}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Stripe Transaction Details */}
          {stripeTransaction && (
            <>
              <div className={styles.section}>
                <h4 className={styles.sectionTitle}>
                  {t("orders.modal.transactionDetails.stripeDetails") || "Stripe Payment Details"}
                </h4>
                <div className={styles.infoGrid}>
                  {stripeTransaction.paymentIntentId && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>
                        {t("orders.modal.transactionDetails.paymentIntentId") || "Payment Intent ID"}:
                      </span>
                      <span className={styles.infoValue}>{stripeTransaction.paymentIntentId}</span>
                    </div>
                  )}
                  {stripeTransaction.customerId && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>
                        {t("orders.modal.transactionDetails.customerId") || "Customer ID"}:
                      </span>
                      <span className={styles.infoValue}>{stripeTransaction.customerId}</span>
                    </div>
                  )}
                  {stripeTransaction.paymentMethod && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>
                        {t("orders.modal.transactionDetails.paymentMethod") || "Payment Method"}:
                      </span>
                      <span className={styles.infoValue}>
                        {stripeTransaction.paymentMethod || "N/A"}
                      </span>
                    </div>
                  )}
                  {stripeTransaction.cardBrand && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>
                        {t("orders.modal.transactionDetails.cardBrand") || "Card Brand"}:
                      </span>
                      <span className={styles.infoValue}>
                        {stripeTransaction.cardBrand || "N/A"}
                      </span>
                    </div>
                  )}
                  {stripeTransaction.cardLast4 && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>
                        {t("orders.modal.transactionDetails.cardLast4") || "Card Last 4"}:
                      </span>
                      <span className={styles.infoValue}>
                        **** {stripeTransaction.cardLast4 || "N/A"}
                      </span>
                    </div>
                  )}
                  {stripeTransaction.description && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>
                        {t("orders.modal.transactionDetails.description") || "Description"}:
                      </span>
                      <span className={styles.infoValue}>{stripeTransaction.description}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stripe Metadata */}
              {stripeTransaction.metadata && Object.keys(stripeTransaction.metadata).length > 0 && (
                <div className={styles.section}>
                  <h4 className={styles.sectionTitle}>
                    {t("orders.modal.transactionDetails.metadata") || "Metadata"}
                  </h4>
                  <div className={styles.metadataContainer}>
                    {Object.entries(stripeTransaction.metadata).map(([key, value]) => (
                      <div key={key} className={styles.metadataItem}>
                        <span className={styles.metadataKey}>{key}:</span>
                        <span className={styles.metadataValue}>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Raw JSON (for debugging) */}
          <div className={styles.section}>
            <details className={styles.details}>
              <summary className={styles.summary}>
                {t("orders.modal.transactionDetails.rawData") || "Raw Transaction Data"}
              </summary>
              <pre className={styles.jsonPreview}>
                {JSON.stringify(transaction, null, 2)}
              </pre>
            </details>
          </div>
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary"
          >
            {t("common.close") || "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailsModal;

