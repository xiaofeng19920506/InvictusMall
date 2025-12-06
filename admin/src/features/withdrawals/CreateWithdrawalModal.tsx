import React, { useState, useEffect } from "react";
import { X, DollarSign, Building2, AlertCircle, Maximize2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { withdrawalApi, type CreateWithdrawalRequest, type StoreBalance } from "../../services/api/withdrawalApi";
import { useNotification } from "../../contexts/NotificationContext";
import styles from "./CreateWithdrawalModal.module.css";

interface StoreOption {
  id: string;
  name: string;
}

interface CreateWithdrawalModalProps {
  storeId?: string;
  storeName?: string;
  stores?: StoreOption[];
  onClose: () => void;
  onSuccess: () => void;
}

// Common US banks list
const COMMON_BANKS = [
  "Chase Bank",
  "Bank of America",
  "Wells Fargo",
  "Citibank",
  "PNC Bank",
  "Citizens Bank",
  "TD Bank",
  "Other",
];

const CreateWithdrawalModal: React.FC<CreateWithdrawalModalProps> = ({
  storeId: initialStoreId,
  storeName: initialStoreName,
  stores: availableStores = [],
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { showError, showSuccess } = useNotification();
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<StoreBalance | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  
  // Determine if we need store selector
  const needsStoreSelector = availableStores.length > 1;
  
  // Determine default store: use initial if provided, otherwise use first available store
  const getDefaultStore = (): StoreOption | null => {
    if (initialStoreId && initialStoreName) {
      return { id: initialStoreId, name: initialStoreName };
    }
    if (availableStores.length > 0) {
      return availableStores[0];
    }
    return null;
  };
  
  const defaultStore = getDefaultStore();
  const [selectedStore, setSelectedStore] = useState<StoreOption | null>(defaultStore);
  
  // Ensure selectedStore is set when component mounts or stores change
  useEffect(() => {
    if (!selectedStore && availableStores.length > 0) {
      const store = initialStoreId && initialStoreName
        ? { id: initialStoreId, name: initialStoreName }
        : availableStores[0];
      if (store) {
        setSelectedStore(store);
      }
    }
  }, [availableStores, initialStoreId, initialStoreName, selectedStore]);
  
  const [formData, setFormData] = useState<CreateWithdrawalRequest>({
    storeId: selectedStore?.id || "",
    amount: 0,
    currency: "USD",
    bankAccountName: "",
    bankAccountNumber: "",
    bankRoutingNumber: "",
    bankName: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCustomBankInput, setShowCustomBankInput] = useState(false);

  // Update formData when selectedStore changes
  useEffect(() => {
    if (selectedStore) {
      setFormData(prev => ({ ...prev, storeId: selectedStore.id }));
    }
  }, [selectedStore]);

  // Load store balance
  useEffect(() => {
    if (!selectedStore?.id) {
      setBalance(null);
      setLoadingBalance(false);
      return;
    }

    const loadBalance = async () => {
      try {
        setLoadingBalance(true);
        const balanceData = await withdrawalApi.getStoreBalanceForOwner(selectedStore.id);
        setBalance(balanceData);
      } catch (error: any) {
        console.error("Failed to load balance:", error);
        showError(error.response?.data?.message || t('withdrawals.createModal.error.loadBalance'));
      } finally {
        setLoadingBalance(false);
      }
    };

    loadBalance();
  }, [selectedStore?.id, t, showError]);

  // Reset form when modal closes
  useEffect(() => {
    if (!showCustomBankInput && formData.bankName === "") {
      // Reset custom bank input state when bank name is cleared
      setShowCustomBankInput(false);
    }
  }, [formData.bankName, showCustomBankInput]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = t('withdrawals.createModal.errors.amountRequired');
    } else if (balance && formData.amount > balance.availableBalance) {
      newErrors.amount = t('withdrawals.createModal.errors.insufficientBalance');
    }

    if (!formData.bankAccountName.trim()) {
      newErrors.bankAccountName = t('withdrawals.createModal.errors.bankAccountNameRequired');
    }

    if (!formData.bankAccountNumber.trim()) {
      newErrors.bankAccountNumber = t('withdrawals.createModal.errors.bankAccountNumberRequired');
    }

    if (!formData.bankRoutingNumber.trim()) {
      newErrors.bankRoutingNumber = t('withdrawals.createModal.errors.bankRoutingNumberRequired');
    }

    if (!formData.bankName.trim()) {
      newErrors.bankName = t('withdrawals.createModal.errors.bankNameRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStore?.id) {
      showError(t('withdrawals.createModal.error.noStoreSelected'));
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      await withdrawalApi.createWithdrawal(selectedStore.id, formData);
      showSuccess(t('withdrawals.createModal.success'));
      // Reset form state
      setShowCustomBankInput(false);
      onSuccess();
      onClose();
    } catch (error: any) {
      showError(error.response?.data?.message || t('withdrawals.createModal.error.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  // Handle set max amount
  const handleSetMaxAmount = () => {
    if (balance) {
      setFormData({ ...formData, amount: balance.availableBalance });
      // Clear amount error if exists
      if (errors.amount) {
        setErrors({ ...errors, amount: "" });
      }
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t('withdrawals.createModal.title')}</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          {/* Store Selector (if multiple stores) */}
          {needsStoreSelector && (
            <div className={styles.formGroup}>
              <label htmlFor="storeSelect" className={styles.label}>
                {t('withdrawals.createModal.selectStore')} *
              </label>
              <select
                id="storeSelect"
                value={selectedStore?.id || ""}
                onChange={(e) => {
                  const store = availableStores.find(s => s.id === e.target.value);
                  if (store) {
                    setSelectedStore(store);
                  }
                }}
                className={styles.select}
              >
                <option value="">{t('withdrawals.createModal.selectStorePlaceholder')}</option>
                {availableStores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Store Info (if single store or store selected) */}
          {selectedStore && (
            <div className={styles.storeInfo}>
              <Building2 size={20} />
              <div>
                <p className={styles.storeLabel}>{t('withdrawals.createModal.store')}</p>
                <p className={styles.storeName}>{selectedStore.name}</p>
              </div>
            </div>
          )}

          {/* Balance Info */}
          {loadingBalance ? (
            <div className={styles.balanceLoading}>{t('withdrawals.createModal.loadingBalance')}</div>
          ) : balance ? (
            <div className={styles.balanceInfo}>
              <div className={styles.balanceCard}>
                <DollarSign size={20} />
                <div>
                  <p className={styles.balanceLabel}>{t('withdrawals.createModal.availableBalance')}</p>
                  <p className={styles.balanceAmount}>{formatCurrency(balance.availableBalance, balance.currency)}</p>
                </div>
              </div>
              <div className={styles.balanceDetails}>
                <div className={styles.balanceDetailItem}>
                  <span>{t('withdrawals.createModal.totalEarnings')}:</span>
                  <span>{formatCurrency(balance.totalEarnings, balance.currency)}</span>
                </div>
                <div className={styles.balanceDetailItem}>
                  <span>{t('withdrawals.createModal.totalWithdrawn')}:</span>
                  <span>{formatCurrency(balance.totalWithdrawn, balance.currency)}</span>
                </div>
                <div className={styles.balanceDetailItem}>
                  <span>{t('withdrawals.createModal.pendingWithdrawals')}:</span>
                  <span>{formatCurrency(balance.pendingWithdrawals, balance.currency)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.balanceError}>
              <AlertCircle size={20} />
              <span>{t('withdrawals.createModal.error.loadBalance')}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="amount" className={styles.label}>
                {t('withdrawals.createModal.amount')} *
              </label>
              <div className={styles.amountInputContainer}>
                <div className={styles.amountInputWrapper}>
                  <span className={styles.currencySymbol}>$</span>
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={balance?.availableBalance || undefined}
                    value={formData.amount || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                    }
                    className={`${styles.input} ${errors.amount ? styles.inputError : ""}`}
                    placeholder="0.00"
                  />
                </div>
                {balance && balance.availableBalance > 0 && (
                  <button
                    type="button"
                    onClick={handleSetMaxAmount}
                    className={styles.maxAmountButton}
                    title={t('withdrawals.createModal.setMaxAmount')}
                  >
                    <Maximize2 size={16} />
                    {t('withdrawals.createModal.maxButton')}
                  </button>
                )}
              </div>
              {errors.amount && <span className={styles.error}>{errors.amount}</span>}
              {balance && (
                <p className={styles.hint}>
                  {t('withdrawals.createModal.maxAmount')}: {formatCurrency(balance.availableBalance, balance.currency)}
                </p>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="bankName" className={styles.label}>
                {t('withdrawals.createModal.bankName')} *
              </label>
              <select
                id="bankName"
                value={showCustomBankInput ? "Other" : formData.bankName}
                onChange={(e) => {
                  const selectedBank = e.target.value;
                  if (selectedBank === "Other") {
                    setShowCustomBankInput(true);
                    setFormData({ ...formData, bankName: "" });
                  } else {
                    setShowCustomBankInput(false);
                    setFormData({ ...formData, bankName: selectedBank });
                  }
                  // Clear error when selection changes
                  if (errors.bankName) {
                    setErrors({ ...errors, bankName: "" });
                  }
                }}
                className={`${styles.select} ${errors.bankName ? styles.inputError : ""}`}
              >
                <option value="">{t('withdrawals.createModal.selectBank')}</option>
                {COMMON_BANKS.map((bank) => (
                  <option key={bank} value={bank}>
                    {bank}
                  </option>
                ))}
              </select>
              {showCustomBankInput && (
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => {
                    setFormData({ ...formData, bankName: e.target.value });
                    if (errors.bankName) {
                      setErrors({ ...errors, bankName: "" });
                    }
                  }}
                  className={`${styles.input} ${errors.bankName ? styles.inputError : ""}`}
                  placeholder={t('withdrawals.createModal.bankNamePlaceholder')}
                />
              )}
              {errors.bankName && <span className={styles.error}>{errors.bankName}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="bankAccountName" className={styles.label}>
                {t('withdrawals.createModal.bankAccountName')} *
              </label>
              <input
                id="bankAccountName"
                type="text"
                value={formData.bankAccountName}
                onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                className={`${styles.input} ${errors.bankAccountName ? styles.inputError : ""}`}
                placeholder={t('withdrawals.createModal.bankAccountNamePlaceholder')}
              />
              {errors.bankAccountName && <span className={styles.error}>{errors.bankAccountName}</span>}
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="bankAccountNumber" className={styles.label}>
                  {t('withdrawals.createModal.bankAccountNumber')} *
                </label>
                <input
                  id="bankAccountNumber"
                  type="text"
                  value={formData.bankAccountNumber}
                  onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                  className={`${styles.input} ${errors.bankAccountNumber ? styles.inputError : ""}`}
                  placeholder={t('withdrawals.createModal.bankAccountNumberPlaceholder')}
                />
                {errors.bankAccountNumber && <span className={styles.error}>{errors.bankAccountNumber}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="bankRoutingNumber" className={styles.label}>
                  {t('withdrawals.createModal.bankRoutingNumber')} *
                </label>
                <input
                  id="bankRoutingNumber"
                  type="text"
                  value={formData.bankRoutingNumber}
                  onChange={(e) => setFormData({ ...formData, bankRoutingNumber: e.target.value })}
                  className={`${styles.input} ${errors.bankRoutingNumber ? styles.inputError : ""}`}
                  placeholder={t('withdrawals.createModal.bankRoutingNumberPlaceholder')}
                />
                {errors.bankRoutingNumber && <span className={styles.error}>{errors.bankRoutingNumber}</span>}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="notes" className={styles.label}>
                {t('withdrawals.createModal.notes')}
              </label>
              <textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className={styles.textarea}
                rows={3}
                placeholder={t('withdrawals.createModal.notesPlaceholder')}
              />
            </div>

            <div className={styles.actions}>
              <button type="button" onClick={onClose} className={styles.cancelButton} disabled={loading}>
                {t('withdrawals.createModal.cancel')}
              </button>
              <button type="submit" className={styles.submitButton} disabled={loading || !balance || !selectedStore}>
                {loading ? t('withdrawals.createModal.submitting') : t('withdrawals.createModal.submit')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateWithdrawalModal;

