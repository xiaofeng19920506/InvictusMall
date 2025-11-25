import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, AlertCircle } from "lucide-react";
import { refundApi } from "../../services/api";
import styles from "./RefundModal.module.css";

export interface RefundModalProps {
  orderId: string;
  orderTotal: number;
  onClose: () => void;
  onRefundSuccess: () => void;
}

const RefundModal: React.FC<RefundModalProps> = ({
  orderId,
  orderTotal,
  onClose,
  onRefundSuccess,
}) => {
  const { t } = useTranslation();
  const [refundAmount, setRefundAmount] = useState<number | "">(orderTotal);
  const [reason, setReason] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingRefunds, setExistingRefunds] = useState<{
    refunds: Array<{
      id: string;
      amount: number;
      status: string;
      reason?: string;
      createdAt: string;
    }>;
    totalRefunded: number;
  } | null>(null);

  useEffect(() => {
    // Load existing refunds
    const loadRefunds = async () => {
      try {
        const response = await refundApi.getOrderRefunds(orderId);
        if (response.success && response.data) {
          setExistingRefunds(response.data);
          const remaining = orderTotal - response.data.totalRefunded;
          setRefundAmount(remaining > 0 ? remaining : 0);
        }
      } catch (err: any) {
        console.error("Failed to load refunds:", err);
      }
    };

    loadRefunds();
  }, [orderId, orderTotal]);

  const remainingAmount = existingRefunds
    ? orderTotal - existingRefunds.totalRefunded
    : orderTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (typeof refundAmount !== "number" || refundAmount <= 0) {
      setError("Please enter a valid refund amount");
      return;
    }

    if (refundAmount > remainingAmount) {
      setError(`Refund amount cannot exceed remaining amount ($${remainingAmount.toFixed(2)})`);
      return;
    }

    setIsProcessing(true);

    try {
      const response = await refundApi.createRefund(orderId, {
        amount: refundAmount,
        reason: reason.trim() || undefined,
      });

      if (response.success) {
        onRefundSuccess();
        onClose();
      } else {
        setError(response.message || "Failed to process refund");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to process refund");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.backdropContainer}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div className={styles.dialog} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h3 className={styles.title}>
            {t("orders.refund.title") || "Process Refund"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("orders.refund.close") || "Close"}
            className={styles.closeButton}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={styles.content}>
          {existingRefunds && existingRefunds.refunds.length > 0 && (
            <div className={styles.refundHistory}>
              <h4 className={styles.sectionTitle}>
                {t("orders.refund.history") || "Refund History"}
              </h4>
              <div className={styles.refundList}>
                {existingRefunds.refunds.map((refund) => (
                  <div key={refund.id} className={styles.refundItem}>
                    <div className={styles.refundInfo}>
                      <span className={styles.refundAmount}>
                        ${refund.amount.toFixed(2)}
                      </span>
                      <span className={styles.refundStatus}>{refund.status}</span>
                    </div>
                    {refund.reason && (
                      <p className={styles.refundReason}>{refund.reason}</p>
                    )}
                    <p className={styles.refundDate}>
                      {new Date(refund.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
              </div>
              <div className={styles.refundSummary}>
                <span>
                  {t("orders.refund.totalRefunded") || "Total Refunded"}:
                </span>
                <strong>${existingRefunds.totalRefunded.toFixed(2)}</strong>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                {t("orders.refund.amount") || "Refund Amount"}
              </label>
              <div className={styles.amountInput}>
                <span className={styles.currency}>$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={remainingAmount}
                  value={refundAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    setRefundAmount(value === "" ? "" : parseFloat(value));
                  }}
                  className={styles.input}
                  required
                />
              </div>
              <p className={styles.helpText}>
                {t("orders.refund.remaining") || "Remaining amount"}: $
                {remainingAmount.toFixed(2)}
              </p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                {t("orders.refund.reason") || "Reason (Optional)"}
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={styles.select}
              >
                <option value="">Select a reason</option>
                <option value="duplicate">Duplicate</option>
                <option value="fraudulent">Fraudulent</option>
                <option value="requested_by_customer">Requested by Customer</option>
              </select>
            </div>

            {error && (
              <div className={styles.error}>
                <AlertCircle className={styles.errorIcon} />
                <span>{error}</span>
              </div>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={isProcessing}
              >
                {t("orders.refund.cancel") || "Cancel"}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isProcessing || remainingAmount <= 0}
              >
                {isProcessing
                  ? t("orders.refund.processing") || "Processing..."
                  : t("orders.refund.process") || "Process Refund"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RefundModal;

