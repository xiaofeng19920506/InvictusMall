import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  Filter,
  Edit2,
  Eye,
  Package,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Store as StoreIcon,
  RefreshCw,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { orderApi, transactionApi, storeApi, type Order, type OrderStatus, type StoreTransaction, type TransactionFilters, type StripeTransaction, type CreateTransactionRequest, type Store } from "../../services/api";
import { useNotification } from "../../contexts/NotificationContext";
import { useAuth } from "../../contexts/AuthContext";
import Pagination from "../../shared/components/Pagination";
import OrderStatusModal from "../orders/OrderStatusModal";
import OrderDetailModal from "../orders/OrderDetailModal";
import ConfirmModal from "../../shared/components/ConfirmModal";
import styles from "./OrdersAndTransactionsManagement.module.css";

type ViewMode = "orders" | "transactions";
type TransactionViewMode = 'local' | 'stripe' | 'both';

const OrdersAndTransactionsManagement: React.FC = () => {
  const { t } = useTranslation();
  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>("orders");

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersSearchQuery, setOrdersSearchQuery] = useState("");
  const [ordersStatusFilter, setOrdersStatusFilter] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isOrderDetailModalOpen, setIsOrderDetailModalOpen] = useState(false);
  const [ordersCurrentPage, setOrdersCurrentPage] = useState(1);
  const [ordersItemsPerPage, setOrdersItemsPerPage] = useState(20);
  const [ordersTotalItems, setOrdersTotalItems] = useState(0);

  // Transactions state
  const [transactions, setTransactions] = useState<StoreTransaction[]>([]);
  const [stripeTransactions, setStripeTransactions] = useState<StripeTransaction[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionViewMode, setTransactionViewMode] = useState<TransactionViewMode>('stripe');
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [filters, setFilters] = useState<TransactionFilters>({ limit: 50, offset: 0 });
  const [stripeFilters, setStripeFilters] = useState<{
    limit?: number;
    type?: 'charge' | 'balance_transaction' | 'payment_intent';
    starting_after?: string;
  }>({ limit: 100, type: 'payment_intent' });
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [stripeType, setStripeType] = useState<'charge' | 'balance_transaction' | 'payment_intent'>('payment_intent');
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [transactionsCurrentPage, setTransactionsCurrentPage] = useState<number>(1);
  const [transactionsItemsPerPage, setTransactionsItemsPerPage] = useState<number>(20);
  const [selectedTransaction, setSelectedTransaction] = useState<StoreTransaction | StripeTransaction | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [userStoreId, setUserStoreId] = useState<string | null>(null);

  // Load orders
  const loadOrders = useCallback(async () => {
    try {
      setOrdersLoading(true);
      const offset = (ordersCurrentPage - 1) * ordersItemsPerPage;
      const response = await orderApi.getAllOrders({
        status: ordersStatusFilter || undefined,
        limit: ordersItemsPerPage,
        offset,
      });
      if (response.success && response.data) {
        setOrders(response.data);
        setOrdersTotalItems((response as any).total || response.data.length);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
      showError(t("orders.error.loadFailed") || "Failed to load orders");
    } finally {
      setOrdersLoading(false);
    }
  }, [ordersStatusFilter, ordersCurrentPage, ordersItemsPerPage, showError, t]);

  // Load transactions
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
      showError(error.response?.data?.message || "Failed to fetch transactions");
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
      showError(error.response?.data?.message || "Failed to fetch Stripe transactions");
    }
  }, [stripeFilters, showError]);

  const loadAllTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    try {
      fetchStores();
      const promises: Promise<void>[] = [];
      if (transactionViewMode === 'local' || transactionViewMode === 'both') {
        promises.push(fetchTransactions());
      }
      if (transactionViewMode === 'stripe' || transactionViewMode === 'both') {
        promises.push(fetchStripeTransactions());
      }
      if (promises.length > 0) {
        await Promise.all(promises);
      } else {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setTransactionsLoading(false);
    }
  }, [transactionViewMode, fetchStores, fetchTransactions, fetchStripeTransactions]);

  // Fetch user store ID
  useEffect(() => {
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
        setUserStoreId(null);
      }
    };
    fetchUserStoreId();
  }, [user]);

  // Load data based on view mode
  useEffect(() => {
    if (viewMode === "orders") {
      loadOrders();
    } else {
      loadAllTransactions();
    }
  }, [viewMode, loadOrders, loadAllTransactions, userStoreId]);

  // Orders handlers
  const handleUpdateStatus = (order: Order) => {
    setSelectedOrder(order);
    setIsStatusModalOpen(true);
  };

  const handleViewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsOrderDetailModalOpen(true);
  };

  const handleStatusUpdate = () => {
    loadOrders();
    setIsStatusModalOpen(false);
    setSelectedOrder(null);
    showSuccess(t("orders.success.statusUpdated") || "Order status updated successfully");
  };

  const handleOrderPageChange = (page: number) => {
    setOrdersCurrentPage(page);
  };

  const handleOrderItemsPerPageChange = (itemsPerPage: number) => {
    setOrdersItemsPerPage(itemsPerPage);
    setOrdersCurrentPage(1);
  };

  // Transactions handlers
  const handleFilterChange = () => {
    const newFilters: TransactionFilters = {
      limit: 1000,
      offset: 0,
    };
    if (selectedStore) newFilters.storeId = selectedStore;
    if (selectedType) newFilters.transactionType = selectedType as any;
    if (selectedStatus) newFilters.status = selectedStatus as any;
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
    setTransactionsCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSelectedStore("");
    setSelectedType("");
    setSelectedStatus("");
    setStartDate("");
    setEndDate("");
    setFilters({ limit: 1000, offset: 0 });
    setTransactionsCurrentPage(1);
  };

  const handleRefund = (transaction: StoreTransaction | StripeTransaction) => {
    const isLocal = (transaction as any).source === 'local';
    if (!isLocal) {
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
      showError(error.response?.data?.message || t("transactions.refund.error") || "Failed to process refund");
    }
  };

  const cancelRefund = () => {
    setShowRefundModal(false);
    setSelectedTransaction(null);
  };

  const handleViewTransactionDetails = (transaction: StoreTransaction | StripeTransaction) => {
    const details = JSON.stringify(transaction, null, 2);
    alert(t("transactions.actionButtons.viewDetails") || "Transaction Details:\n\n" + details);
  };

  // Filter orders
  const filteredOrders = useMemo(() => {
    let filtered = orders;
    if (ordersSearchQuery.trim()) {
      const query = ordersSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.id.toLowerCase().includes(query) ||
          order.storeName.toLowerCase().includes(query) ||
          order.userId.toLowerCase().includes(query) ||
          order.items.some((item) => item.productName.toLowerCase().includes(query))
      );
    }
    return filtered;
  }, [orders, ordersSearchQuery]);

  // Process transactions
  const availableStores = stores.filter((store) => {
    if (user?.role === "admin") return true;
    return userStoreId ? store.id === userStoreId : false;
  });

  const storeMap = new Map<string, string>();
  stores.forEach(store => {
    storeMap.set(store.id, store.name);
  });

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

  const totalAmount = transactionViewMode === 'both' ? localTotalAmount + stripeTotalAmount :
    transactionViewMode === 'local' ? localTotalAmount : stripeTotalAmount;
  const totalSales = transactionViewMode === 'both' ? localTotalSales + stripeTotalSales :
    transactionViewMode === 'local' ? localTotalSales : stripeTotalSales;
  const totalRefunds = transactionViewMode === 'both' ? localTotalRefunds + stripeTotalRefunds :
    transactionViewMode === 'local' ? localTotalRefunds : stripeTotalRefunds;

  let allTransactions = transactionViewMode === 'both'
    ? [
      ...transactions.map(t => ({ ...t, source: 'local' as const })),
      ...stripeTransactions.map(t => ({ ...t, source: 'stripe' as const }))
    ]
    : transactionViewMode === 'local'
      ? transactions.map(t => ({ ...t, source: 'local' as const }))
      : stripeTransactions.map(t => ({ ...t, source: 'stripe' as const }));

  allTransactions = allTransactions.filter(t => t.storeId != null);

  if (user && user.role !== "admin" && userStoreId) {
    allTransactions = allTransactions.filter(t => {
      if ((t as any).source === 'local') {
        return t.storeId === userStoreId;
      }
      return t.storeId === userStoreId;
    });
  }

  if ((transactionViewMode === 'stripe' || transactionViewMode === 'both') && (startDate || endDate)) {
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

  allTransactions.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

  const totalTransactions = allTransactions.length;
  const totalTransactionPages = Math.ceil(totalTransactions / transactionsItemsPerPage);
  const transactionsStartIndex = (transactionsCurrentPage - 1) * transactionsItemsPerPage;
  const transactionsEndIndex = transactionsStartIndex + transactionsItemsPerPage;
  const paginatedTransactions = allTransactions.slice(transactionsStartIndex, transactionsEndIndex);

  const handleTransactionPageChange = (page: number) => {
    setTransactionsCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTransactionItemsPerPageChange = (value: number) => {
    setTransactionsItemsPerPage(value);
    setTransactionsCurrentPage(1);
  };

  // Format functions
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

  const getStatusBadgeClass = (status: OrderStatus) => {
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

  const formatStatus = (status: OrderStatus) => {
    return t(`orders.status.${status}`) || status;
  };

  const getTransactionStatusColor = (status: string) => {
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

  const ordersTotalPages = Math.ceil(ordersTotalItems / ordersItemsPerPage);

  return (
    <div className={styles.container}>
      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        <button
          className={`${styles.tab} ${viewMode === "orders" ? styles.tabActive : ""}`}
          onClick={() => setViewMode("orders")}
        >
          <Package className={styles.tabIcon} />
          {t("orders.title") || "Orders"}
        </button>
        <button
          className={`${styles.tab} ${viewMode === "transactions" ? styles.tabActive : ""}`}
          onClick={() => setViewMode("transactions")}
        >
          <DollarSign className={styles.tabIcon} />
          {t("transactions.title") || "Transactions"}
        </button>
      </div>

      {/* Orders View */}
      {viewMode === "orders" && (
        <div className={styles.viewContent}>
          <div className={styles.filters}>
            <div className={styles.searchBox}>
              <Search className={styles.searchIcon} />
              <input
                type="text"
                placeholder={t("orders.search.placeholder") || "Search orders..."}
                value={ordersSearchQuery}
                onChange={(e) => setOrdersSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <div className={styles.filterBox}>
              <Filter className={styles.filterIcon} />
              <select
                value={ordersStatusFilter}
                onChange={(e) => setOrdersStatusFilter(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">{t("orders.filter.allStatuses") || "All Statuses"}</option>
                <option value="pending_payment">
                  {t("orders.status.pending_payment") || "Pending Payment"}
                </option>
                <option value="pending">{t("orders.status.pending") || "Pending"}</option>
                <option value="processing">
                  {t("orders.status.processing") || "Processing"}
                </option>
                <option value="shipped">{t("orders.status.shipped") || "Shipped"}</option>
                <option value="delivered">
                  {t("orders.status.delivered") || "Delivered"}
                </option>
                <option value="cancelled">
                  {t("orders.status.cancelled") || "Cancelled"}
                </option>
              </select>
            </div>
          </div>

          {ordersLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>{t("orders.loading") || "Loading orders..."}</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className={styles.empty}>
              <Package className={styles.emptyIcon} />
              <p>{t("orders.empty.noOrders") || "No orders found"}</p>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("orders.table.orderId") || "Order ID"}</th>
                    <th>{t("orders.table.store") || "Store"}</th>
                    <th>{t("orders.table.items") || "Items"}</th>
                    <th>{t("orders.table.total") || "Total"}</th>
                    <th>{t("orders.table.status") || "Status"}</th>
                    <th>{t("orders.table.date") || "Date"}</th>
                    <th>{t("orders.table.actions") || "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <code className={styles.orderId}>{order.id.slice(0, 8)}...</code>
                      </td>
                      <td>
                        <div className={styles.storeCell}>{order.storeName}</div>
                      </td>
                      <td>
                        <div className={styles.itemsCell}>
                          {order.items.length} {order.items.length === 1 ? t("orders.item") || "item" : t("orders.items") || "items"}
                        </div>
                      </td>
                      <td>
                        <span className={styles.totalAmount}>
                          {formatCurrency(order.totalAmount)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${getStatusBadgeClass(order.status)}`}
                        >
                          {formatStatus(order.status)}
                        </span>
                      </td>
                      <td>
                        <div className={styles.dateCell}>{formatDate(order.orderDate)}</div>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            onClick={() => handleViewOrderDetails(order)}
                            className={styles.viewButton}
                            title={t("orders.actions.view") || "View Details"}
                          >
                            <Eye className={styles.actionIcon} />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(order)}
                            className={styles.editButton}
                            title={t("orders.actions.updateStatus") || "Update Status"}
                          >
                            <Edit2 className={styles.actionIcon} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                currentPage={ordersCurrentPage}
                totalPages={ordersTotalPages}
                totalItems={ordersTotalItems}
                itemsPerPage={ordersItemsPerPage}
                onPageChange={handleOrderPageChange}
                onItemsPerPageChange={handleOrderItemsPerPageChange}
              />
            </div>
          )}
        </div>
      )}

      {/* Transactions View */}
      {viewMode === "transactions" && (
        <div className={styles.viewContent}>
          <div className={styles.transactionsHeader}>
            <div className={styles.viewModeSelector}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                {t("transactions.viewMode") || "View:"}
              </label>
              <select
                value={transactionViewMode}
                onChange={(e) => {
                  setTransactionViewMode(e.target.value as TransactionViewMode);
                }}
                className={styles.viewModeSelect}
              >
                <option value="stripe">{t("transactions.stripeTransactions") || "Stripe Transactions"}</option>
                <option value="local">{t("transactions.localTransactions") || "Local Transactions"}</option>
                <option value="both">{t("transactions.allTransactions") || "All Transactions"}</option>
              </select>
            </div>
            <div className={styles.refreshSection}>
              {lastRefreshTime && (
                <span className={styles.lastRefresh}>
                  {t("transactions.lastRefresh") || "Last refresh:"} {lastRefreshTime.toLocaleTimeString()}
                </span>
              )}
              <button
                className={styles.refreshButton}
                onClick={loadAllTransactions}
                disabled={transactionsLoading}
              >
                <RefreshCw
                  className={`${styles.refreshIcon} ${transactionsLoading ? styles.spinning : ""}`}
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
              {transactionViewMode === 'local' || transactionViewMode === 'both' ? (
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
                      <option value="refund">{t("transactions.type.refund") || "Refund"}</option>
                      <option value="payment">{t("transactions.type.payment") || "Payment"}</option>
                      <option value="fee">{t("transactions.type.fee") || "Fee"}</option>
                      <option value="commission">{t("transactions.type.commission") || "Commission"}</option>
                    </select>
                  </div>
                </>
              ) : null}
              {transactionViewMode === 'stripe' || transactionViewMode === 'both' ? (
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>
                    {t("transactions.stripeType") || "Stripe Type"}
                  </label>
                  <select
                    className={styles.filterSelect}
                    value={stripeType}
                    onChange={(e) => {
                      setStripeType(e.target.value as any);
                      setStripeFilters({ ...stripeFilters, type: e.target.value as any, starting_after: undefined });
                    }}
                  >
                    <option value="payment_intent">
                      {t("transactions.stripeTypes.paymentIntent") || "Payment Intents"}
                    </option>
                    <option value="charge">{t("transactions.stripeTypes.charge") || "Charges"}</option>
                    <option value="balance_transaction">
                      {t("transactions.stripeTypes.balanceTransaction") || "Balance Transactions"}
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
                  <option value="">{t("transactions.allStatuses") || "All Statuses"}</option>
                  <option value="pending">{t("transactions.statuses.pending") || "Pending"}</option>
                  <option value="completed">{t("transactions.statuses.completed") || "Completed"}</option>
                  <option value="failed">{t("transactions.statuses.failed") || "Failed"}</option>
                  <option value="cancelled">{t("transactions.statuses.cancelled") || "Cancelled"}</option>
                  <option value="refunded">{t("transactions.statuses.refunded") || "Refunded"}</option>
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
            {transactionsLoading ? (
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
              <>
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
                      const transactionStoreId = transaction.storeId;
                      const storeName = transactionStoreId
                        ? (storeMap.get(transactionStoreId) || transactionStoreId)
                        : '-';

                      return (
                        <tr key={`${(transaction as any).source}-${transaction.id}`}>
                          <td>{formatDate(transaction.transactionDate)}</td>
                          <td>
                            <span className={styles.storeNameCell}>
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
                              className={`${styles.statusBadge} ${getTransactionStatusColor(
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
                            <div className={styles.actions}>
                              {!isRefund && transaction.status === 'completed' && (
                                <button
                                  onClick={() => handleRefund(transaction)}
                                  title={t("transactions.actionButtons.refund") || "Refund"}
                                  className={styles.refundButton}
                                >
                                  <RotateCcw size={16} />
                                </button>
                              )}
                              <button
                                onClick={() => handleViewTransactionDetails(transaction)}
                                title={t("transactions.actionButtons.viewDetails") || "View Details"}
                                className={styles.viewButton}
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
                {/* Pagination */}
                {!transactionsLoading && totalTransactions > 0 && (
                  <div className={styles.paginationContainer}>
                    <div className={styles.paginationInfo}>
                      <label>
                        {t("transactions.itemsPerPage") || "Items per page:"}
                      </label>
                      <select
                        value={transactionsItemsPerPage}
                        onChange={(e) => handleTransactionItemsPerPageChange(Number(e.target.value))}
                        className={styles.paginationSelect}
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                    <div className={styles.paginationControls}>
                      <span>
                        {t("transactions.showing") || "Showing"} {transactionsStartIndex + 1} - {Math.min(transactionsEndIndex, totalTransactions)} {t("transactions.of") || "of"} {totalTransactions.toLocaleString()}
                      </span>
                      <div className={styles.paginationButtons}>
                        <button
                          onClick={() => handleTransactionPageChange(transactionsCurrentPage - 1)}
                          disabled={transactionsCurrentPage === 1}
                          className={styles.paginationButton}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        {Array.from({ length: Math.min(7, totalTransactionPages) }, (_, i) => {
                          let pageNum: number;
                          if (totalTransactionPages <= 7) {
                            pageNum = i + 1;
                          } else if (transactionsCurrentPage <= 4) {
                            pageNum = i + 1;
                          } else if (transactionsCurrentPage >= totalTransactionPages - 3) {
                            pageNum = totalTransactionPages - 6 + i;
                          } else {
                            pageNum = transactionsCurrentPage - 3 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handleTransactionPageChange(pageNum)}
                              className={`${styles.paginationButton} ${transactionsCurrentPage === pageNum ? styles.paginationButtonActive : ""}`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => handleTransactionPageChange(transactionsCurrentPage + 1)}
                          disabled={transactionsCurrentPage === totalTransactionPages}
                          className={styles.paginationButton}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {isStatusModalOpen && selectedOrder && (
        <OrderStatusModal
          order={selectedOrder}
          onClose={() => {
            setIsStatusModalOpen(false);
            setSelectedOrder(null);
          }}
          onUpdate={handleStatusUpdate}
        />
      )}

      {isOrderDetailModalOpen && selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => {
            setIsOrderDetailModalOpen(false);
            setSelectedOrder(null);
          }}
        />
      )}

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

export default OrdersAndTransactionsManagement;

