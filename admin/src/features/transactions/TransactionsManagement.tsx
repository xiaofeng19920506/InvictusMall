import React, { useEffect, useState, useCallback } from "react";
import {
  RefreshCw,
  Filter,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Store as StoreIcon,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Eye,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { transactionApi, storeApi, type StoreTransaction, type TransactionFilters, type StripeTransaction, type CreateTransactionRequest } from "../../services/api";
import { useNotification } from "../../contexts/NotificationContext";
import { useAuth } from "../../contexts/AuthContext";
import type { Store } from "../../shared/types/store";
import ConfirmModal from "../../shared/components/ConfirmModal";
import styles from "./TransactionsManagement.module.css";

type TransactionViewMode = 'local' | 'stripe' | 'both';

const TransactionsManagement: React.FC = () => {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<StoreTransaction[]>([]);
  const [stripeTransactions, setStripeTransactions] = useState<StripeTransaction[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<TransactionViewMode>('stripe');
  const [filters, setFilters] = useState<TransactionFilters>({
    limit: 50,
    offset: 0,
  });
  const [stripeFilters, setStripeFilters] = useState<{
    limit?: number;
    type?: 'charge' | 'balance_transaction' | 'payment_intent';
    starting_after?: string;
  }>({
    limit: 50,
    type: 'charge',
  });
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [stripeType, setStripeType] = useState<'charge' | 'balance_transaction' | 'payment_intent'>('charge');
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);
  const [selectedTransaction, setSelectedTransaction] = useState<StoreTransaction | StripeTransaction | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [userStoreId, setUserStoreId] = useState<string | null>(null);
  const { showError, showSuccess } = useNotification();
  const { user } = useAuth();

  const fetchStores = useCallback(async () => {
    try {
      const response = await storeApi.getAllStores();
      if (response.success && response.data) {
        setStores(response.data);
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      // For non-admin users, automatically filter by their storeId
      const filtersToUse = { ...filters };
      if (user && user.role !== "admin" && userStoreId) {
        filtersToUse.storeId = userStoreId;
      }
      
      const response = await transactionApi.getTransactions(filtersToUse);
      if (response.success && response.data) {
        setTransactions(response.data);
      } else {
        showError(response.message || "Failed to fetch transactions");
      }
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      showError(
        error.response?.data?.message || "Failed to fetch transactions"
      );
    }
  }, [filters, showError, user, userStoreId]);

  const fetchStripeTransactions = useCallback(async () => {
    try {
      const response = await transactionApi.getStripeTransactions(stripeFilters);
      if (response.success && response.data) {
        setStripeTransactions(response.data);
      } else {
        showError(response.message || "Failed to fetch Stripe transactions");
      }
    } catch (error: any) {
      console.error("Error fetching Stripe transactions:", error);
      showError(
        error.response?.data?.message || "Failed to fetch Stripe transactions"
      );
    }
  }, [stripeFilters, showError]);

  const loadAllTransactions = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch stores first (no await to not block)
      fetchStores();
      
      // Fetch transactions based on view mode
      const promises: Promise<void>[] = [];
      
      if (viewMode === 'local' || viewMode === 'both') {
        promises.push(fetchTransactions());
      }
      if (viewMode === 'stripe' || viewMode === 'both') {
        promises.push(fetchStripeTransactions());
      }
      
      if (promises.length > 0) {
        await Promise.all(promises);
      } else {
        // If no promises, still wait a bit to show loading state
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  }, [viewMode, fetchStores, fetchTransactions, fetchStripeTransactions]);

  useEffect(() => {
    loadAllTransactions();
  }, [loadAllTransactions, userStoreId]); // Reload when userStoreId changes

  const handleFilterChange = () => {
    const newFilters: TransactionFilters = {
      limit: 1000, // Get more to support client-side filtering and pagination
      offset: 0,
    };

    if (selectedStore) newFilters.storeId = selectedStore;
    if (selectedType) newFilters.transactionType = selectedType as any;
    if (selectedStatus) newFilters.status = selectedStatus as any;
    // Convert date strings to ISO format with time (start of day for startDate, end of day for endDate)
    if (startDate) {
      const startDateTime = new Date(startDate);
      startDateTime.setHours(0, 0, 0, 0);
      newFilters.startDate = startDateTime.toISOString();
    }
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      newFilters.endDate = endDateTime.toISOString();
    }

    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleResetFilters = () => {
    setSelectedStore("");
    setSelectedType("");
    setSelectedStatus("");
    setStartDate("");
    setEndDate("");
    setFilters({ limit: 1000, offset: 0 });
    setCurrentPage(1);
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
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


  // Role-based filtering: Non-admin users can only see their store's transactions
  // Get user's storeId from the user object (if available) or fetch it
  useEffect(() => {
    // Fetch user's storeId if not admin
    const fetchUserStoreId = async () => {
      if (user && user.role !== "admin") {
        try {
          const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
          const token = localStorage.getItem('staff_auth_token');
          const headers: HeadersInit = {};
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }
          const response = await fetch(`${apiUrl}/api/staff/me`, {
            headers,
            credentials: "include",
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
              const storeId = (data.user as any).storeId;
              setUserStoreId(storeId || null);
            }
          }
        } catch (error) {
          console.error("Error fetching user store ID:", error);
        }
      } else {
        setUserStoreId(null); // Admin can see all stores
      }
    };
    
    fetchUserStoreId();
  }, [user]);

  // Filter stores based on user role
  const availableStores = stores.filter((store) => {
    if (user?.role === "admin") return true;
    // For non-admin users, only show their store
    return userStoreId ? store.id === userStoreId : false;
  });
  
  // Create a map of storeId to store name for quick lookup
  const storeMap = new Map<string, string>();
  stores.forEach(store => {
    storeMap.set(store.id, store.name);
  });

  // Calculate totals for local transactions
  const localTotalAmount = transactions.reduce((sum, t) => {
    if (t.status === "completed") {
      return sum + (t.transactionType === "refund" ? -t.amount : t.amount);
    }
    return sum;
  }, 0);

  const localTotalSales = transactions
    .filter((t) => t.transactionType === "sale" && t.status === "completed")
    .reduce((sum, t) => sum + t.amount, 0);

  const localTotalRefunds = transactions
    .filter((t) => t.transactionType === "refund" && t.status === "completed")
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate totals for Stripe transactions
  const stripeTotalAmount = stripeTransactions.reduce((sum, t) => {
    if (t.status === "completed") {
      return sum + ((t.transactionType === "refund" || t.amount < 0) ? -Math.abs(t.amount) : t.amount);
    }
    return sum;
  }, 0);

  const stripeTotalSales = stripeTransactions
    .filter((t) => (t.transactionType === "sale" || !t.transactionType || t.transactionType === "payment") && t.status === "completed" && t.amount > 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const stripeTotalRefunds = stripeTransactions
    .filter((t) => (t.transactionType === "refund" || t.amount < 0) && t.status === "completed")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Combined totals
  const totalAmount = viewMode === 'both' ? localTotalAmount + stripeTotalAmount : 
                      viewMode === 'local' ? localTotalAmount : stripeTotalAmount;
  const totalSales = viewMode === 'both' ? localTotalSales + stripeTotalSales :
                     viewMode === 'local' ? localTotalSales : stripeTotalSales;
  const totalRefunds = viewMode === 'both' ? localTotalRefunds + stripeTotalRefunds :
                       viewMode === 'local' ? localTotalRefunds : stripeTotalRefunds;

  // Combined transaction list with client-side date filtering for Stripe
  let allTransactions = viewMode === 'both' 
    ? [
        ...transactions.map(t => ({ ...t, source: 'local' as const })),
        ...stripeTransactions.map(t => ({ ...t, source: 'stripe' as const }))
      ]
    : viewMode === 'local'
    ? transactions.map(t => ({ ...t, source: 'local' as const }))
    : stripeTransactions.map(t => ({ ...t, source: 'stripe' as const }));

  // Filter out transactions with null storeId
  allTransactions = allTransactions.filter(t => t.storeId != null);

  // Filter transactions based on user role - non-admin users only see their store's transactions
  if (user && user.role !== "admin" && userStoreId) {
    allTransactions = allTransactions.filter(t => {
      // For local transactions, filter by storeId
      if ((t as any).source === 'local') {
        return t.storeId === userStoreId;
      }
      // For Stripe transactions, filter by storeId
      return t.storeId === userStoreId;
    });
  }

  // Apply client-side date filtering for Stripe transactions
  if ((viewMode === 'stripe' || viewMode === 'both') && (startDate || endDate)) {
    allTransactions = allTransactions.filter(t => {
      const transactionDate = new Date(t.transactionDate);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (transactionDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (transactionDate > end) return false;
      }
      return true;
    });
  }

  // Sort by transaction date (newest first)
  allTransactions.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

  // Pagination calculations
  const totalTransactions = allTransactions.length;
  const totalPages = Math.ceil(totalTransactions / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = allTransactions.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of table
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const handleRefund = (transaction: StoreTransaction | StripeTransaction) => {
    const isLocal = (transaction as any).source === 'local';
    
    if (!isLocal) {
      // For Stripe transactions, show a message that Stripe refunds need to be processed in Stripe dashboard
      showError(t("transactions.refund.stripeMessage") || "Stripe refunds must be processed through the Stripe dashboard");
      return;
    }

    setSelectedTransaction(transaction);
    setShowRefundModal(true);
  };

  const confirmRefund = async () => {
    if (!selectedTransaction) return;

    try {
      const isLocal = (selectedTransaction as any).source === 'local';
      
      if (isLocal) {
        // For local transactions, create a refund transaction
        const localTransaction = selectedTransaction as StoreTransaction;
        const refundData: CreateTransactionRequest = {
          storeId: localTransaction.storeId,
          transactionType: 'refund',
          amount: Math.abs(localTransaction.amount),
          currency: localTransaction.currency || 'USD',
          description: `Refund for transaction ${localTransaction.id}`,
          customerId: localTransaction.customerId,
          customerName: localTransaction.customerName,
          orderId: localTransaction.orderId,
          paymentMethod: localTransaction.paymentMethod,
          status: 'pending',
          transactionDate: new Date().toISOString(),
          metadata: {
            originalTransactionId: localTransaction.id,
            refundReason: 'Admin refund',
          },
        };

        const response = await transactionApi.createTransaction(refundData);
        if (response.success) {
          showSuccess(t("transactions.refund.success") || "Refund transaction created successfully");
          loadAllTransactions();
          setShowRefundModal(false);
          setSelectedTransaction(null);
        } else {
          showError(response.message || t("transactions.refund.error") || "Failed to create refund");
        }
      }
    } catch (error: any) {
      console.error("Error processing refund:", error);
      showError(
        error.response?.data?.message || t("transactions.refund.error") || "Failed to process refund"
      );
    }
  };

  const cancelRefund = () => {
    setShowRefundModal(false);
    setSelectedTransaction(null);
  };

  const handleViewDetails = (transaction: StoreTransaction | StripeTransaction) => {
    // TODO: Implement view details modal
    console.log("View details for transaction:", transaction);
    // For now, just show an alert with transaction details
    const details = JSON.stringify(transaction, null, 2);
    alert(t("transactions.actionButtons.viewDetails") || "Transaction Details:\n\n" + details);
  };

  return (
    <div className={styles.container}>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>
              {t("transactions.viewMode") || "View:"}
            </label>
            <select
              value={viewMode}
              onChange={(e) => {
                setViewMode(e.target.value as TransactionViewMode);
              }}
              style={{
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              <option value="stripe">{t("transactions.stripeTransactions") || "Stripe Transactions"}</option>
              <option value="local">{t("transactions.localTransactions") || "Local Transactions"}</option>
              <option value="both">{t("transactions.allTransactions") || "All Transactions"}</option>
            </select>
          </div>
          <button
            className={styles.refreshButton}
            onClick={loadAllTransactions}
            disabled={loading}
          >
            <RefreshCw
              className={`${styles.refreshIcon} ${loading ? styles.spinning : ""}`}
            />
            {t("transactions.refresh") || "Refresh"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <DollarSign />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>
              {t("transactions.totalAmount") || "Total Amount"}
            </div>
            <div className={styles.statValue}>
              {formatCurrency(totalAmount)}
            </div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.salesIcon}`}>
            <TrendingUp />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>
              {t("transactions.totalSales") || "Total Sales"}
            </div>
            <div className={styles.statValue}>
              {formatCurrency(totalSales)}
            </div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.refundIcon}`}>
            <TrendingDown />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>
              {t("transactions.totalRefunds") || "Total Refunds"}
            </div>
            <div className={styles.statValue}>
              {formatCurrency(totalRefunds)}
            </div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <StoreIcon />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>
              {t("transactions.totalTransactions") || "Total Transactions"}
            </div>
            <div className={styles.statValue}>
              {totalTransactions.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterRow}>
          {viewMode === 'local' || viewMode === 'both' ? (
            <>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>
                  {t("transactions.filter.store") || "Store"}
                </label>
                <select
                  className={styles.filterSelect}
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                >
                  <option value="">{t("transactions.allStores") || "All Stores"}</option>
                  {availableStores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>
                  {t("transactions.filter.type") || "Type"}
                </label>
                <select
                  className={styles.filterSelect}
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="">{t("transactions.allTypes") || "All Types"}</option>
                  <option value="sale">{t("transactions.type.sale") || "Sale"}</option>
                  <option value="refund">
                    {t("transactions.type.refund") || "Refund"}
                  </option>
                  <option value="payment">
                    {t("transactions.type.payment") || "Payment"}
                  </option>
                  <option value="fee">{t("transactions.type.fee") || "Fee"}</option>
                  <option value="commission">
                    {t("transactions.type.commission") || "Commission"}
                  </option>
                </select>
              </div>
            </>
          ) : null}

          {viewMode === 'stripe' || viewMode === 'both' ? (
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>
                {t("transactions.stripeType") || "Stripe Type"}
              </label>
              <select
                className={styles.filterSelect}
                value={stripeType}
                onChange={(e) => {
                  setStripeType(e.target.value as any);
                  setStripeFilters({ ...stripeFilters, type: e.target.value as any });
                }}
              >
                <option value="charge">{t("transactions.stripeTypes.charge") || "Charges"}</option>
                <option value="balance_transaction">
                  {t("transactions.stripeTypes.balanceTransaction") || "Balance Transactions"}
                </option>
                <option value="payment_intent">
                  {t("transactions.stripeTypes.paymentIntent") || "Payment Intents"}
                </option>
              </select>
            </div>
          ) : null}

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>
              {t("transactions.filter.status") || "Status"}
            </label>
            <select
              className={styles.filterSelect}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">
                {t("transactions.allStatuses") || "All Statuses"}
              </option>
              <option value="pending">
                {t("transactions.statuses.pending") || "Pending"}
              </option>
              <option value="completed">
                {t("transactions.statuses.completed") || "Completed"}
              </option>
              <option value="failed">
                {t("transactions.statuses.failed") || "Failed"}
              </option>
              <option value="cancelled">
                {t("transactions.statuses.cancelled") || "Cancelled"}
              </option>
              <option value="refunded">
                {t("transactions.statuses.refunded") || "Refunded"}
              </option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>
              {t("transactions.filter.startDate") || "Start Date"}
            </label>
            <input
              type="date"
              className={styles.filterInput}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>
              {t("transactions.filter.endDate") || "End Date"}
            </label>
            <input
              type="date"
              className={styles.filterInput}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.filterActions}>
          <button
            className={styles.applyButton}
            onClick={handleFilterChange}
          >
            <Filter className={styles.buttonIcon} />
            {t("transactions.applyFilters") || "Apply Filters"}
          </button>
          <button
            className={styles.resetButton}
            onClick={handleResetFilters}
          >
            {t("transactions.resetFilters") || "Reset"}
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.loading}>
            <RefreshCw className={styles.spinning} />
            <p>{t("transactions.loading") || "Loading transactions..."}</p>
          </div>
        ) : allTransactions.length === 0 ? (
          <div className={styles.empty}>
            <DollarSign className={styles.emptyIcon} />
            <p>{t("transactions.noTransactions") || "No transactions found"}</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("transactions.date") || "Date"}</th>
                <th>{t("transactions.store") || "Store"}</th>
                <th>{t("transactions.customer") || "Customer"}</th>
                <th>{t("transactions.amount") || "Amount"}</th>
                <th>{t("transactions.status") || "Status"}</th>
                <th>{t("transactions.paymentMethod") || "Payment Method"}</th>
                <th>{t("transactions.description") || "Description"}</th>
                <th>{t("transactions.actions") || "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map((transaction) => {
                const isLocal = (transaction as any).source === 'local';
                const transactionType = transaction.transactionType || (isLocal ? 'sale' : 'payment');
                const isRefund = transactionType === "refund" || (transaction.amount < 0 && !isLocal);
                
                // Get store name for display
                const transactionStoreId = transaction.storeId;
                const storeName = transactionStoreId 
                  ? (storeMap.get(transactionStoreId) || transactionStoreId) 
                  : '-';
                
                return (
                  <tr key={`${(transaction as any).source}-${transaction.id}`}>
                    <td>{formatDate(transaction.transactionDate)}</td>
                    <td>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.25rem',
                        fontWeight: 500,
                        color: '#374151'
                      }}>
                        <StoreIcon size={14} />
                        {storeName}
                      </span>
                    </td>
                    <td>
                      {transaction.customerName ||
                        transaction.customerId ||
                        "-"}
                    </td>
                    <td
                      className={
                        isRefund
                          ? styles.negativeAmount
                          : styles.positiveAmount
                      }
                    >
                      {isRefund ? "-" : "+"}
                      {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${getStatusColor(
                          transaction.status
                        )}`}
                      >
                        {transaction.status.charAt(0).toUpperCase() +
                          transaction.status.slice(1)}
                      </span>
                    </td>
                    <td>{transaction.paymentMethod || "-"}</td>
                    <td className={styles.descriptionCell}>
                      {transaction.description || "-"}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {!isRefund && transaction.status === 'completed' && (
                          <button
                            onClick={() => handleRefund(transaction)}
                            title={t("transactions.actionButtons.refund") || "Refund"}
                            style={{
                              padding: '0.375rem',
                              borderRadius: '0.375rem',
                              border: '1px solid #e5e7eb',
                              backgroundColor: 'white',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              color: '#dc2626',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#fef2f2';
                              e.currentTarget.style.borderColor = '#dc2626';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'white';
                              e.currentTarget.style.borderColor = '#e5e7eb';
                            }}
                          >
                            <RotateCcw size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleViewDetails(transaction)}
                          title={t("transactions.actionButtons.viewDetails") || "View Details"}
                          style={{
                            padding: '0.375rem',
                            borderRadius: '0.375rem',
                            border: '1px solid #e5e7eb',
                            backgroundColor: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            color: '#6b7280',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f9fafb';
                            e.currentTarget.style.borderColor = '#9ca3af';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'white';
                            e.currentTarget.style.borderColor = '#e5e7eb';
                          }}
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
        )}

        {/* Pagination Controls */}
        {!loading && totalTransactions > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1.5rem',
            padding: '1rem',
            borderTop: '1px solid #e5e7eb',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {t("transactions.itemsPerPage") || "Items per page:"}
              </label>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {t("transactions.showing") || "Showing"} {startIndex + 1} - {Math.min(endIndex, totalTransactions)} {t("transactions.of") || "of"} {totalTransactions.toLocaleString()}
              </span>

              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    opacity: currentPage === 1 ? 0.5 : 1,
                  }}
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Page Numbers */}
                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (currentPage <= 4) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = currentPage - 3 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.375rem',
                        border: '1px solid #d1d5db',
                        backgroundColor: currentPage === pageNum ? '#6366f1' : 'white',
                        color: currentPage === pageNum ? 'white' : '#374151',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: currentPage === pageNum ? 600 : 400,
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    backgroundColor: currentPage === totalPages ? '#f3f4f6' : 'white',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Refund Confirmation Modal */}
      <ConfirmModal
        isOpen={showRefundModal}
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
        onConfirm={confirmRefund}
        onCancel={cancelRefund}
        type="danger"
      />
    </div>
  );
};

export default TransactionsManagement;

