import React, { useEffect, useState, useMemo } from "react";
import {
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Building2,
  Filter,
  Eye,
  Plus,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { withdrawalApi, type Withdrawal, type StoreBalance } from "../../services/api/withdrawalApi";
import { storeApi } from "../../services/api";
import { useNotification } from "../../contexts/NotificationContext";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./WithdrawalsManagement.module.css";
import WithdrawalDetailModal from "./WithdrawalDetailModal";
import CreateWithdrawalModal from "./CreateWithdrawalModal";
import Pagination from "../../shared/components/Pagination";

type WithdrawalStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'rejected' | 'cancelled';

const WithdrawalsManagement: React.FC = () => {
  const { t } = useTranslation();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<WithdrawalStatus | "all">("all");
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStoreForCreate, setSelectedStoreForCreate] = useState<{ id: string; name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const { showError, showSuccess } = useNotification();
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";
  const isOwner = user?.role === "owner";

  // Load withdrawals
  const loadWithdrawals = async () => {
    try {
      setLoading(true);
      let data: Withdrawal[] = [];

      console.log('=== Loading Withdrawals ===');
      console.log('User role:', user?.role);
      console.log('isAdmin:', isAdmin);
      console.log('isOwner:', isOwner);
      console.log('statusFilter:', statusFilter);
      console.log('storeFilter:', storeFilter);
      console.log('stores:', stores);

      if (isAdmin) {
        // Admin: Get all withdrawals
        console.log('Fetching all withdrawals as admin...');
        data = await withdrawalApi.getAllWithdrawals({
          status: statusFilter !== "all" ? statusFilter : undefined,
          storeId: storeFilter !== "all" ? storeFilter : undefined,
        });
        console.log('Admin withdrawals loaded:', data);
        console.log('Admin withdrawals count:', data.length);
      } else if (isOwner) {
        // Owner: Get withdrawals for their stores
        console.log('Fetching withdrawals as owner...');
        const ownerStores = stores.length > 0 ? stores : await loadOwnerStores();
        console.log('Owner stores:', ownerStores);
        
        if (ownerStores.length === 0) {
          console.log('No stores found for owner, setting empty withdrawals');
          setWithdrawals([]);
          return;
        }

        // If a specific store is selected, get withdrawals for that store only
        if (storeFilter !== "all") {
          const storeId = storeFilter;
          console.log('Fetching withdrawals for specific store:', storeId);
          data = await withdrawalApi.getStoreWithdrawals(storeId);
          console.log('Store withdrawals loaded:', data);
        } else {
          // Get withdrawals for all owner's stores
          console.log('Fetching withdrawals for all owner stores...');
          const allWithdrawals = await Promise.all(
            ownerStores.map((store) => {
              console.log('Fetching withdrawals for store:', store.id, store.name);
              return withdrawalApi.getStoreWithdrawals(store.id);
            })
          );
          console.log('All withdrawals arrays:', allWithdrawals);
          data = allWithdrawals.flat();
          console.log('Flattened withdrawals:', data);
        }

        // Apply status filter
        if (statusFilter !== "all") {
          const beforeFilter = data.length;
          data = data.filter((w) => w.status === statusFilter);
          console.log(`Status filter applied: ${beforeFilter} -> ${data.length}`);
        }
        console.log('Owner withdrawals loaded:', data);
        console.log('Owner withdrawals count:', data.length);
      } else {
        console.log('User is neither admin nor owner, no withdrawals to load');
      }

      console.log('Final withdrawals data:', data);
      console.log('Final withdrawals count:', data.length);
      setWithdrawals(data);
    } catch (error: any) {
      console.error('Error loading withdrawals:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      showError(error.response?.data?.message || t('withdrawals.error.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Load owner's stores
  const loadOwnerStores = async (): Promise<Array<{ id: string; name: string }>> => {
    try {
      const response = await storeApi.getAllStores();
      const storesData = response.data || [];
      return storesData.map((store: any) => ({ id: store.id, name: store.name }));
    } catch (error) {
      console.error("Failed to load owner stores:", error);
      return [];
    }
  };

  // Load stores for filter
  const loadStores = async () => {
    try {
      const response = await storeApi.getAllStores();
      // storeApi.getAllStores returns ApiResponse<Store[]>, so we need to access response.data
      const storesData = response.data || [];
      const storesList = storesData.map((store: any) => ({ id: store.id, name: store.name }));
      setStores(storesList);
      
      // For owner, set the first store as default if only one store
      if (isOwner && storesList.length === 1) {
        setStoreFilter(storesList[0].id);
      }
      
      // For admin, if only one store, set it as default for creating withdrawal
      if (isAdmin && storesList.length === 1) {
        setStoreFilter(storesList[0].id);
      }
    } catch (error) {
      console.error("Failed to load stores:", error);
    }
  };

  useEffect(() => {
    loadWithdrawals();
    if (isOwner || isAdmin) {
      loadStores();
    }
  }, [statusFilter, storeFilter, isOwner, isAdmin]);

  // Filter withdrawals by search term
  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((withdrawal) => {
      const matchesSearch =
        withdrawal.storeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        withdrawal.bankAccountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        withdrawal.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        withdrawal.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [withdrawals, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredWithdrawals.length / itemsPerPage);
  const paginatedWithdrawals = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredWithdrawals.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredWithdrawals, currentPage, itemsPerPage]);

  // Status badge
  const getStatusBadge = (status: WithdrawalStatus) => {
    const statusConfig = {
      pending: { label: t('withdrawals.status.pending'), className: styles.statusPending, icon: Clock },
      approved: { label: t('withdrawals.status.approved'), className: styles.statusApproved, icon: CheckCircle },
      processing: { label: t('withdrawals.status.processing'), className: styles.statusProcessing, icon: RefreshCw },
      completed: { label: t('withdrawals.status.completed'), className: styles.statusCompleted, icon: CheckCircle },
      rejected: { label: t('withdrawals.status.rejected'), className: styles.statusRejected, icon: XCircle },
      cancelled: { label: t('withdrawals.status.cancelled'), className: styles.statusCancelled, icon: XCircle },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span className={`${styles.statusBadge} ${config.className}`}>
        <Icon size={14} />
        {config.label}
      </span>
    );
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handle view details
  const handleViewDetails = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setShowDetailModal(true);
  };

  // Handle refresh
  const handleRefresh = () => {
    loadWithdrawals();
    showSuccess(t('withdrawals.actions.refreshed'));
  };

  // Handle create withdrawal
  const handleCreateWithdrawal = () => {
    if (stores.length === 0) {
      showError(t('withdrawals.createModal.error.noStores'));
      return;
    }

    // If only one store, use it directly
    if (stores.length === 1) {
      setSelectedStoreForCreate(stores[0]);
      setShowCreateModal(true);
    } else {
      // Multiple stores - pass all stores to modal for selection
      // Use the selected filter store as default if available
      const defaultStore = storeFilter !== "all" 
        ? stores.find(s => s.id === storeFilter) || stores[0]
        : stores[0];
      setSelectedStoreForCreate(defaultStore);
      setShowCreateModal(true);
    }
  };

  // Handle create success
  const handleCreateSuccess = () => {
    loadWithdrawals();
    loadStores();
  };

  // Statistics
  const stats = useMemo(() => {
    const total = withdrawals.length;
    const pending = withdrawals.filter((w) => w.status === "pending").length;
    const approved = withdrawals.filter((w) => w.status === "approved").length;
    const completed = withdrawals.filter((w) => w.status === "completed").length;
    const totalAmount = withdrawals
      .filter((w) => w.status === "completed")
      .reduce((sum, w) => sum + w.amount, 0);

    return { total, pending, approved, completed, totalAmount };
  }, [withdrawals]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('withdrawals.title')}</h1>
          <p className={styles.subtitle}>
            {isAdmin ? t('withdrawals.subtitle') : t('withdrawals.subtitleOwner')}
          </p>
        </div>
        <div className={styles.headerActions}>
          {(isOwner || isAdmin) && stores.length > 0 && (
            <button onClick={handleCreateWithdrawal} className={styles.createButton} disabled={loading}>
              <Plus size={20} />
              {t('withdrawals.createButton')}
            </button>
          )}
          {(isOwner || isAdmin) && stores.length === 0 && !loading && (
            <div className={styles.noStoresMessage}>
              {t('withdrawals.createModal.error.noStores')}
            </div>
          )}
          <button onClick={handleRefresh} className={styles.refreshButton} disabled={loading}>
            <RefreshCw size={20} className={loading ? styles.spinning : ""} />
            {t('withdrawals.refresh')}
          </button>
        </div>
      </div>

      {/* Store Selector (for owners with multiple stores) */}
      {isOwner && stores.length > 1 && (
        <div className={styles.storeSelectorSection}>
          <label htmlFor="storeSelector" className={styles.storeSelectorLabel}>
            {t('withdrawals.selectStore')}:
          </label>
          <select
            id="storeSelector"
            value={storeFilter}
            onChange={(e) => {
              setStoreFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.storeSelector}
          >
            <option value="all">{t('withdrawals.filters.allStores')}</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Statistics */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <DollarSign size={24} />
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>{t('withdrawals.stats.total')}</p>
            <p className={styles.statValue}>{stats.total}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Clock size={24} />
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>{t('withdrawals.stats.pending')}</p>
            <p className={styles.statValue}>{stats.pending}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <CheckCircle size={24} />
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>{t('withdrawals.stats.approved')}</p>
            <p className={styles.statValue}>{stats.approved}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <CheckCircle size={24} />
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>{t('withdrawals.stats.completed')}</p>
            <p className={styles.statValue}>{stats.completed}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <DollarSign size={24} />
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>{t('withdrawals.stats.totalPaid')}</p>
            <p className={styles.statValue}>{formatCurrency(stats.totalAmount)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={20} />
            <input
            type="text"
            placeholder={t('withdrawals.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterGroup}>
          <Filter size={18} />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as WithdrawalStatus | "all");
              setCurrentPage(1);
            }}
            className={styles.filterSelect}
          >
            <option value="all">{t('withdrawals.filters.allStatus')}</option>
            <option value="pending">{t('withdrawals.filters.pending')}</option>
            <option value="approved">{t('withdrawals.filters.approved')}</option>
            <option value="processing">{t('withdrawals.filters.processing')}</option>
            <option value="completed">{t('withdrawals.filters.completed')}</option>
            <option value="rejected">{t('withdrawals.filters.rejected')}</option>
            <option value="cancelled">{t('withdrawals.filters.cancelled')}</option>
          </select>
          {isAdmin && (
            <select
              value={storeFilter}
              onChange={(e) => {
                setStoreFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.filterSelect}
            >
              <option value="all">{t('withdrawals.filters.allStores')}</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.loading}>{t('withdrawals.loading')}</div>
        ) : paginatedWithdrawals.length === 0 ? (
          <div className={styles.emptyState}>
            <DollarSign size={48} />
            <p>{t('withdrawals.empty')}</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('withdrawals.table.store')}</th>
                <th>{t('withdrawals.table.amount')}</th>
                <th>{t('withdrawals.table.bankAccount')}</th>
                <th>{t('withdrawals.table.status')}</th>
                <th>{t('withdrawals.table.requested')}</th>
                <th>{t('withdrawals.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedWithdrawals.map((withdrawal) => (
                <tr key={withdrawal.id}>
                  <td>
                    <div className={styles.storeCell}>
                      <Building2 size={16} />
                      <span>{withdrawal.storeName || "Unknown Store"}</span>
                    </div>
                  </td>
                  <td className={styles.amountCell}>
                    {formatCurrency(withdrawal.amount, withdrawal.currency)}
                  </td>
                  <td>
                    <div className={styles.bankCell}>
                      <span className={styles.bankName}>{withdrawal.bankName}</span>
                      <span className={styles.bankAccount}>
                        {withdrawal.bankAccountName} ••••{withdrawal.bankAccountNumber.slice(-4)}
                      </span>
                    </div>
                  </td>
                  <td>{getStatusBadge(withdrawal.status)}</td>
                  <td className={styles.dateCell}>{formatDate(withdrawal.requestedAt)}</td>
                  <td>
                    <button
                      onClick={() => handleViewDetails(withdrawal)}
                      className={styles.viewButton}
                      title={t('withdrawals.actions.viewDetails')}
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedWithdrawal && (
        <WithdrawalDetailModal
          withdrawal={selectedWithdrawal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedWithdrawal(null);
          }}
          onUpdate={loadWithdrawals}
        />
      )}

      {/* Create Withdrawal Modal */}
      {showCreateModal && (
        <CreateWithdrawalModal
          storeId={selectedStoreForCreate?.id}
          storeName={selectedStoreForCreate?.name}
          stores={stores}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedStoreForCreate(null);
          }}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
};

export default WithdrawalsManagement;

