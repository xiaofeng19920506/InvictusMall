import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, AlertCircle, Package } from "lucide-react";
import { refundApi, type OrderItem } from "../../services/api";
import { getImageUrl } from "../../shared/utils/imageUtils";
import styles from "./RefundModal.module.css";

export interface RefundModalProps {
  orderId: string;
  orderTotal: number;
  orderItems: OrderItem[];
  onClose: () => void;
  onRefundSuccess: () => void;
}

const RefundModal: React.FC<RefundModalProps> = ({
  orderId,
  orderTotal,
  orderItems,
  onClose,
  onRefundSuccess,
}) => {
  const { t } = useTranslation();
  const [refundType, setRefundType] = useState<"full" | "partial" | null>(null);
  const [partialRefundMethod, setPartialRefundMethod] = useState<"items" | "custom" | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
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
  }>({ refunds: [], totalRefunded: 0 });

  useEffect(() => {
    // Load existing refunds
    const loadRefunds = async () => {
      try {
        const response = await refundApi.getOrderRefunds(orderId);
        if (response.success && response.data) {
          setExistingRefunds(response.data);
        } else {
          // If no refunds exist, set empty state
          setExistingRefunds({ refunds: [], totalRefunded: 0 });
        }
      } catch (err: any) {
        console.error("Failed to load refunds:", err);
        // Set empty state on error so modal can still function
        setExistingRefunds({ refunds: [], totalRefunded: 0 });
      }
    };

    loadRefunds();
  }, [orderId, orderTotal]);

  // Calculate remaining amount
  const remainingAmount = orderTotal - existingRefunds.totalRefunded;

  // Calculate refund amount based on selected items
  useEffect(() => {
    if (refundType === "full") {
      setRefundAmount(remainingAmount > 0 ? remainingAmount : 0);
    } else if (refundType === "partial" && partialRefundMethod === "items") {
      // Calculate amount from selected items
      const selectedItemsAmount = Array.from(selectedItems).reduce((sum, itemId) => {
        const item = orderItems.find(i => i.id === itemId);
        return sum + (item ? item.subtotal : 0);
      }, 0);
      setRefundAmount(selectedItemsAmount);
    } else if (refundType === "partial" && partialRefundMethod === "custom") {
      // Keep custom amount or set default
      if (typeof refundAmount !== "number" || refundAmount === 0) {
        setRefundAmount(remainingAmount > 0 ? remainingAmount / 2 : 0);
      }
    }
  }, [refundType, partialRefundMethod, selectedItems, orderItems, remainingAmount]);

  // Calculate selected items total
  const selectedItemsTotal = Array.from(selectedItems).reduce((sum, itemId) => {
    const item = orderItems.find(i => i.id === itemId);
    return sum + (item ? item.subtotal : 0);
  }, 0);

  const handleItemToggle = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let finalAmount: number;
    if (refundType === "full") {
      finalAmount = remainingAmount;
    } else if (refundType === "partial" && partialRefundMethod === "items") {
      if (selectedItems.size === 0) {
        setError(t("orders.refund.errors.noItemsSelected") || "Please select at least one item to refund");
        return;
      }
      finalAmount = selectedItemsTotal;
    } else if (refundType === "partial" && partialRefundMethod === "custom") {
      finalAmount = typeof refundAmount === "number" ? refundAmount : 0;
    } else {
      setError(t("orders.refund.errors.selectPartialMethod") || "Please select a partial refund method.");
      return;
    }

    if (finalAmount <= 0) {
      setError(t("orders.refund.errors.invalidAmount") || "Please enter a valid refund amount");
      return;
    }

    if (finalAmount > remainingAmount) {
      setError(t("orders.refund.errors.exceedsRemaining", { amount: remainingAmount.toFixed(2) }) || `Refund amount cannot exceed remaining amount ($${remainingAmount.toFixed(2)})`);
      return;
    }

    setIsProcessing(true);

    try {
      const refundData: any = {
        amount: finalAmount,
        reason: reason.trim() || undefined,
      };

      // If refunding by items, include item IDs
      if (refundType === "partial" && partialRefundMethod === "items") {
        refundData.itemIds = Array.from(selectedItems);
      }

      const response = await refundApi.createRefund(orderId, refundData);

      if (response.success) {
        onRefundSuccess();
        onClose();
      } else {
        const errorMessage = response.message || "Failed to process refund";
        // Check for specific error messages and provide user-friendly translations
        if (errorMessage.toLowerCase().includes("payment intent") || errorMessage.toLowerCase().includes("does not have a payment")) {
          setError(t("orders.refund.errors.noPaymentIntent") || "This order does not have a payment method. Refunds can only be processed for orders paid with credit cards.");
        } else {
          setError(errorMessage);
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to process refund";
      // Check for specific error messages and provide user-friendly translations
      if (errorMessage.toLowerCase().includes("payment intent") || errorMessage.toLowerCase().includes("does not have a payment")) {
        setError(t("orders.refund.errors.noPaymentIntent") || "This order does not have a payment method. Refunds can only be processed for orders paid with credit cards.");
      } else {
        setError(errorMessage);
      }
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

          {!refundType ? (
            <div className={styles.refundTypeSelection}>
              <h4 className={styles.sectionTitle}>
                {t("orders.refund.selectType") || "Select Refund Type"}
              </h4>
              <p className={styles.helpText}>
                {t("orders.refund.selectTypeHelp") || "Choose whether to refund the full amount or a partial amount"}
              </p>
              <div className={styles.refundTypeButtons}>
                <button
                  type="button"
                  onClick={() => setRefundType("full")}
                  className={`${styles.refundTypeButton} ${styles.fullRefundButton}`}
                  disabled={remainingAmount <= 0}
                >
                  <div className={styles.refundTypeButtonContent}>
                    <span className={styles.refundTypeButtonTitle}>
                      {t("orders.refund.fullRefund") || "Full Refund"}
                    </span>
                    <span className={styles.refundTypeButtonAmount}>
                      ${remainingAmount.toFixed(2)}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setRefundType("partial")}
                  className={`${styles.refundTypeButton} ${styles.partialRefundButton}`}
                  disabled={remainingAmount <= 0}
                >
                  <div className={styles.refundTypeButtonContent}>
                    <span className={styles.refundTypeButtonTitle}>
                      {t("orders.refund.partialRefund") || "Partial Refund"}
                    </span>
                    <span className={styles.refundTypeButtonDescription}>
                      {t("orders.refund.partialRefundDesc") || "Enter custom amount"}
                    </span>
                  </div>
                </button>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary"
                >
                  {t("orders.refund.cancel") || "Cancel"}
                </button>
              </div>
            </div>
          ) : (
            <>
            {refundType === "partial" && !partialRefundMethod && (
              <div className={styles.refundTypeSelection}>
                <h4 className={styles.sectionTitle}>
                  {t("orders.refund.selectPartialMethod") || "Select Partial Refund Method"}
                </h4>
                <p className={styles.helpText}>
                  {t("orders.refund.selectPartialMethodHelp") || "Choose how to specify the partial refund amount."}
                </p>
                <div className={styles.refundTypeButtons}>
                  <button
                    type="button"
                    onClick={() => setPartialRefundMethod("items")}
                    className={`${styles.refundTypeButton} ${styles.partialRefundButton}`}
                  >
                    <div className={styles.refundTypeButtonContent}>
                      <span className={styles.refundTypeButtonTitle}>
                        {t("orders.refund.refundByItems") || "By Items"}
                      </span>
                      <span className={styles.refundTypeButtonDescription}>
                        {t("orders.refund.refundByItemsDesc") || "Select specific items to refund."}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPartialRefundMethod("custom")}
                    className={`${styles.refundTypeButton} ${styles.partialRefundButton}`}
                  >
                    <div className={styles.refundTypeButtonContent}>
                      <span className={styles.refundTypeButtonTitle}>
                        {t("orders.refund.customAmount") || "Custom Amount"}
                      </span>
                      <span className={styles.refundTypeButtonDescription}>
                        {t("orders.refund.customAmountDesc") || "Enter a specific amount to refund."}
                      </span>
                    </div>
                  </button>
                </div>
                <div className={styles.actions}>
                  <button
                    type="button"
                    onClick={() => {
                      setRefundType(null);
                      setPartialRefundMethod(null);
                      setSelectedItems(new Set());
                      setError(null);
                    }}
                    className="btn btn-secondary"
                  >
                    {t("orders.refund.back") || "Back"}
                  </button>
                </div>
              </div>
            )}

            {refundType && (refundType === "full" || partialRefundMethod) && (
            <form onSubmit={handleSubmit} className={styles.form}>
            {refundType === "partial" && partialRefundMethod === "items" && (
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  {t("orders.refund.selectItems") || "Select Items to Refund"}
                </label>
                <div className={styles.itemsList}>
                  {orderItems.map((item) => {
                    const isSelected = selectedItems.has(item.id);
                    const isRefunded = existingRefunds.refunds.some(
                      (r: any) => r.itemIds && r.itemIds.includes(item.id)
                    );
                    return (
                      <div
                        key={item.id}
                        className={`${styles.itemCard} ${isSelected ? styles.itemSelected : ""} ${isRefunded ? styles.itemRefunded : ""}`}
                        onClick={(e) => {
                          // Don't trigger if clicking on checkbox or its label
                          if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).closest('input')) {
                            return;
                          }
                          if (!isRefunded) {
                            handleItemToggle(item.id);
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (!isRefunded) {
                              handleItemToggle(item.id);
                            }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          disabled={isRefunded}
                          className={styles.itemCheckbox}
                        />
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
                            {isRefunded && (
                              <span className={styles.refundedBadge}>
                                {t("orders.refund.alreadyRefunded") || "Already Refunded"}
                              </span>
                            )}
                          </div>
                          <div className={styles.itemInfo}>
                            <span className={styles.itemQuantity}>
                              {t("orders.quantity") || "Qty"}: {item.quantity}
                            </span>
                            <span className={styles.itemPrice}>
                              {formatCurrency(item.subtotal)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {selectedItems.size > 0 && (
                  <div className={styles.selectedItemsSummary}>
                    <span className={styles.selectedItemsLabel}>
                      {t("orders.refund.selectedItemsTotal") || "Selected Items Total"}:
                    </span>
                    <span className={styles.selectedItemsAmount}>
                      {formatCurrency(selectedItemsTotal)}
                    </span>
                  </div>
                )}
                <p className={styles.helpText}>
                  {t("orders.refund.remaining") || "Remaining amount"}: {formatCurrency(remainingAmount)}
                </p>
              </div>
            )}

            {refundType === "partial" && partialRefundMethod === "custom" && (
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
                  {t("orders.refund.remaining") || "Remaining amount"}: {formatCurrency(remainingAmount)}
                </p>
              </div>
            )}

            {refundType === "full" && (
              <div className={styles.formGroup}>
                <div className={styles.fullRefundInfo}>
                  <span className={styles.fullRefundLabel}>
                    {t("orders.refund.refundingFullAmount") || "Refunding Full Amount"}:
                  </span>
                  <span className={styles.fullRefundValue}>
                    {formatCurrency(remainingAmount)}
                  </span>
                </div>
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.label}>
                {t("orders.refund.reason") || "Reason (Optional)"}
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={styles.select}
              >
                <option value="">{t("orders.refund.selectReason") || "Select a reason"}</option>
                <option value="duplicate">{t("orders.refund.reasons.duplicate") || "Duplicate"}</option>
                <option value="fraudulent">{t("orders.refund.reasons.fraudulent") || "Fraudulent"}</option>
                <option value="requested_by_customer">{t("orders.refund.reasons.requested_by_customer") || "Requested by Customer"}</option>
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
                onClick={() => {
                  if (refundType === "partial" && partialRefundMethod) {
                    setPartialRefundMethod(null);
                    setSelectedItems(new Set());
                  } else {
                    setRefundType(null);
                    setPartialRefundMethod(null);
                    setSelectedItems(new Set());
                  }
                  setError(null);
                }}
                className="btn btn-secondary"
                disabled={isProcessing}
              >
                {t("orders.refund.back") || "Back"}
              </button>
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
                disabled={
                  isProcessing || 
                  remainingAmount <= 0 || 
                  (refundType === "partial" && partialRefundMethod === "items" && selectedItems.size === 0)
                }
              >
                {isProcessing
                  ? t("orders.refund.processing") || "Processing..."
                  : t("orders.refund.process") || "Process Refund"}
              </button>
            </div>
          </form>
            )}
          </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RefundModal;

