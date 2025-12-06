import React, { useState, useEffect } from "react";
import { X, CheckCircle, XCircle, Clock, DollarSign, Building2, User, Calendar, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { withdrawalApi, type Withdrawal, type StoreBalance } from "../../services/api/withdrawalApi";
import { useNotification } from "../../contexts/NotificationContext";
import ConfirmModal from "../../shared/components/ConfirmModal";
import styles from "./WithdrawalDetailModal.module.css";

interface WithdrawalDetailModalProps {
  withdrawal: Withdrawal;
  onClose: () => void;
  onUpdate: () => void;
}

const WithdrawalDetailModal: React.FC<WithdrawalDetailModalProps> = ({
  withdrawal,
  onClose,
  onUpdate,
}) => {
  const { t } = useTranslation();
  const [storeBalance, setStoreBalance] = useState<StoreBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<{
    isOpen: boolean;
    action: string;
    message: string;
  }>({
    isOpen: false,
    action: "",
    message: "",
  });
  const [rejectionReason, setRejectionReason] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const { showError, showSuccess } = useNotification();

  useEffect(() => {
    loadStoreBalance();
  }, [withdrawal.storeId]);

  const loadStoreBalance = async () => {
    try {
      const balance = await withdrawalApi.getStoreBalance(withdrawal.storeId);
      setStoreBalance(balance);
    } catch (error) {
      console.error("Failed to load store balance:", error);
    }
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleApprove = async () => {
    try {
      setActionLoading("approve");
      await withdrawalApi.approveWithdrawal(withdrawal.id);
      showSuccess(t('withdrawals.detail.success.approved'));
      onUpdate();
      onClose();
    } catch (error: any) {
      showError(error.response?.data?.message || t('withdrawals.detail.error.approveFailed'));
    } finally {
      setActionLoading(null);
      setShowConfirmModal({ isOpen: false, action: "", message: "" });
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      showError(t('withdrawals.detail.error.rejectionReasonRequired'));
      return;
    }

    try {
      setActionLoading("reject");
      await withdrawalApi.rejectWithdrawal(withdrawal.id, rejectionReason);
      showSuccess(t('withdrawals.detail.success.rejected'));
      onUpdate();
      onClose();
    } catch (error: any) {
      showError(error.response?.data?.message || t('withdrawals.detail.error.rejectFailed'));
    } finally {
      setActionLoading(null);
      setShowConfirmModal({ isOpen: false, action: "", message: "" });
      setRejectionReason("");
    }
  };

  const handleComplete = async () => {
    try {
      setActionLoading("complete");
      await withdrawalApi.completeWithdrawal(withdrawal.id, completionNotes || undefined);
      showSuccess(t('withdrawals.detail.success.completed'));
      onUpdate();
      onClose();
    } catch (error: any) {
      showError(error.response?.data?.message || t('withdrawals.detail.error.completeFailed'));
    } finally {
      setActionLoading(null);
      setShowConfirmModal({ isOpen: false, action: "", message: "" });
      setCompletionNotes("");
    }
  };

  const canApprove = withdrawal.status === "pending";
  const canReject = withdrawal.status === "pending" || withdrawal.status === "approved";
  const canComplete = withdrawal.status === "approved" || withdrawal.status === "processing";

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{t('withdrawals.detail.title')}</h2>
            <p className={styles.subtitle}>{t('withdrawals.detail.subtitle', { id: withdrawal.id })}</p>
          </div>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.content}>
          {/* Store Balance Info */}
          {storeBalance && (
            <div className={styles.balanceCard}>
              <h3 className={styles.sectionTitle}>{t('withdrawals.detail.storeBalance')}</h3>
              <div className={styles.balanceGrid}>
                <div className={styles.balanceItem}>
                  <span className={styles.balanceLabel}>{t('withdrawals.detail.balance.totalEarnings')}</span>
                  <span className={styles.balanceValue}>
                    {formatCurrency(storeBalance.totalEarnings)}
                  </span>
                </div>
                <div className={styles.balanceItem}>
                  <span className={styles.balanceLabel}>{t('withdrawals.detail.balance.platformCommission')}</span>
                  <span className={styles.balanceValue}>
                    {formatCurrency(storeBalance.platformCommission)}
                  </span>
                </div>
                <div className={styles.balanceItem}>
                  <span className={styles.balanceLabel}>{t('withdrawals.detail.balance.totalWithdrawn')}</span>
                  <span className={styles.balanceValue}>
                    {formatCurrency(storeBalance.totalWithdrawn)}
                  </span>
                </div>
                <div className={styles.balanceItem}>
                  <span className={styles.balanceLabel}>{t('withdrawals.detail.balance.pendingWithdrawals')}</span>
                  <span className={styles.balanceValue}>
                    {formatCurrency(storeBalance.pendingWithdrawals)}
                  </span>
                </div>
                <div className={styles.balanceItem}>
                  <span className={styles.balanceLabel}>{t('withdrawals.detail.balance.availableBalance')}</span>
                  <span className={`${styles.balanceValue} ${styles.availableBalance}`}>
                    {formatCurrency(storeBalance.availableBalance)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Withdrawal Info */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{t('withdrawals.detail.withdrawalInfo')}</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <Building2 size={18} />
                <div>
                  <span className={styles.infoLabel}>{t('withdrawals.detail.fields.store')}</span>
                  <span className={styles.infoValue}>{withdrawal.storeName || "Unknown"}</span>
                </div>
              </div>
              <div className={styles.infoItem}>
                <DollarSign size={18} />
                <div>
                  <span className={styles.infoLabel}>{t('withdrawals.detail.fields.amount')}</span>
                  <span className={styles.infoValue}>
                    {formatCurrency(withdrawal.amount, withdrawal.currency)}
                  </span>
                </div>
              </div>
              <div className={styles.infoItem}>
                <Clock size={18} />
                <div>
                  <span className={styles.infoLabel}>{t('withdrawals.detail.fields.status')}</span>
                  <span className={styles.infoValue}>{withdrawal.status.toUpperCase()}</span>
                </div>
              </div>
              <div className={styles.infoItem}>
                <Calendar size={18} />
                <div>
                  <span className={styles.infoLabel}>{t('withdrawals.detail.fields.requestedAt')}</span>
                  <span className={styles.infoValue}>{formatDate(withdrawal.requestedAt)}</span>
                </div>
              </div>
              {withdrawal.approvedAt && (
                <div className={styles.infoItem}>
                  <CheckCircle size={18} />
                  <div>
                    <span className={styles.infoLabel}>{t('withdrawals.detail.fields.approvedAt')}</span>
                    <span className={styles.infoValue}>{formatDate(withdrawal.approvedAt)}</span>
                  </div>
                </div>
              )}
              {withdrawal.processedAt && (
                <div className={styles.infoItem}>
                  <CheckCircle size={18} />
                  <div>
                    <span className={styles.infoLabel}>{t('withdrawals.detail.fields.processedAt')}</span>
                    <span className={styles.infoValue}>{formatDate(withdrawal.processedAt)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bank Account Info */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{t('withdrawals.detail.bankAccountInfo')}</h3>
            <div className={styles.bankInfo}>
              <div className={styles.bankRow}>
                <span className={styles.bankLabel}>{t('withdrawals.detail.fields.bankName')}:</span>
                <span className={styles.bankValue}>{withdrawal.bankName}</span>
              </div>
              <div className={styles.bankRow}>
                <span className={styles.bankLabel}>{t('withdrawals.detail.fields.accountName')}:</span>
                <span className={styles.bankValue}>{withdrawal.bankAccountName}</span>
              </div>
              <div className={styles.bankRow}>
                <span className={styles.bankLabel}>{t('withdrawals.detail.fields.accountNumber')}:</span>
                <span className={styles.bankValue}>
                  ••••{withdrawal.bankAccountNumber.slice(-4)}
                </span>
              </div>
              <div className={styles.bankRow}>
                <span className={styles.bankLabel}>{t('withdrawals.detail.fields.routingNumber')}:</span>
                <span className={styles.bankValue}>
                  ••••{withdrawal.bankRoutingNumber.slice(-4)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {withdrawal.notes && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>{t('withdrawals.detail.notes')}</h3>
              <p className={styles.notesText}>{withdrawal.notes}</p>
            </div>
          )}

          {/* Rejection Reason */}
          {withdrawal.rejectionReason && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>{t('withdrawals.detail.rejectionReason')}</h3>
              <p className={styles.rejectionReason}>{withdrawal.rejectionReason}</p>
            </div>
          )}

          {/* Action Forms */}
          {canReject && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>{t('withdrawals.detail.rejectionReason')}</h3>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t('withdrawals.detail.rejectionReasonPlaceholder')}
                className={styles.textarea}
                rows={3}
              />
            </div>
          )}

          {canComplete && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>{t('withdrawals.detail.completionNotes')}</h3>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder={t('withdrawals.detail.completionNotesPlaceholder')}
                className={styles.textarea}
                rows={3}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {canApprove && (
            <button
              onClick={() =>
                setShowConfirmModal({
                  isOpen: true,
                  action: "approve",
                  message: t('withdrawals.detail.confirm.approve.message', { amount: formatCurrency(withdrawal.amount) }),
                })
              }
              className={styles.approveButton}
              disabled={actionLoading !== null}
            >
              <CheckCircle size={18} />
              {actionLoading === "approve" ? t('common.updating') : t('withdrawals.actions.approve')}
            </button>
          )}
          {canReject && (
            <button
              onClick={() =>
                setShowConfirmModal({
                  isOpen: true,
                  action: "reject",
                  message: t('withdrawals.detail.confirm.reject.message'),
                })
              }
              className={styles.rejectButton}
              disabled={actionLoading !== null}
            >
              <XCircle size={18} />
              {actionLoading === "reject" ? t('common.updating') : t('withdrawals.actions.reject')}
            </button>
          )}
          {canComplete && (
            <button
              onClick={() =>
                setShowConfirmModal({
                  isOpen: true,
                  action: "complete",
                  message: t('withdrawals.detail.confirm.complete.message'),
                })
              }
              className={styles.completeButton}
              disabled={actionLoading !== null}
            >
              <CheckCircle size={18} />
              {actionLoading === "complete" ? t('common.updating') : t('withdrawals.actions.complete')}
            </button>
          )}
          <button onClick={onClose} className={styles.cancelButton}>
            {t('common.close')}
          </button>
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirmModal.isOpen && (
        <ConfirmModal
          isOpen={showConfirmModal.isOpen}
          title={
            showConfirmModal.action === "approve"
              ? t('withdrawals.detail.confirm.approve.title')
              : showConfirmModal.action === "reject"
              ? t('withdrawals.detail.confirm.reject.title')
              : t('withdrawals.detail.confirm.complete.title')
          }
          message={showConfirmModal.message}
          type={
            showConfirmModal.action === "reject"
              ? "danger"
              : showConfirmModal.action === "complete"
              ? "warning"
              : "info"
          }
          onConfirm={() => {
            if (showConfirmModal.action === "approve") {
              handleApprove();
            } else if (showConfirmModal.action === "reject") {
              if (!rejectionReason.trim()) {
                showError(t('withdrawals.detail.error.rejectionReasonRequired'));
                return;
              }
              handleReject();
            } else if (showConfirmModal.action === "complete") {
              handleComplete();
            }
          }}
          onCancel={() =>
            setShowConfirmModal({ isOpen: false, action: "", message: "" })
          }
        />
      )}
    </>
  );
};

export default WithdrawalDetailModal;

