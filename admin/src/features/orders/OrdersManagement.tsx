<<<<<<< HEAD
import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, Filter, Edit2, Eye, Package } from "lucide-react";
import { orderApi, type Order, type OrderStatus } from "../../services/api";
=======
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Package } from "lucide-react";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
import { useNotification } from "../../contexts/NotificationContext";
import Pagination from "../../shared/components/Pagination";
import OrderStatusModal from "./OrderStatusModal";
import OrderDetailModal from "./OrderDetailModal";
<<<<<<< HEAD
=======
import OrderFilters from "./components/OrderFilters";
import OrderTable from "./components/OrderTable";
import {
  useGetAllOrdersQuery,
  useGetMyStoresForOrdersQuery,
} from "../../store/api/ordersApi";
import {
  setSelectedOrder,
  setIsStatusModalOpen,
  setIsDetailModalOpen,
  setCurrentPage,
  setItemsPerPage,
  setAccessibleStores,
} from "../../store/slices/ordersSlice";
import { useGetAllStoresQuery } from "../../store/api/storesApi";
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
import styles from "./OrdersManagement.module.css";

const OrdersManagement: React.FC = () => {
  const { t } = useTranslation();
<<<<<<< HEAD
  const { showSuccess, showError } = useNotification();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    loadOrders();
  }, [statusFilter, currentPage, itemsPerPage]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;
      const response = await orderApi.getAllOrders({
        status: statusFilter || undefined,
        limit: itemsPerPage,
        offset,
      });
      if (response.success && response.data) {
        setOrders(response.data);
        setTotalItems((response as any).total || response.data.length);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
      showError(t("orders.error.loadFailed") || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = (order: Order) => {
    setSelectedOrder(order);
    setIsStatusModalOpen(true);
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  const handleStatusUpdate = () => {
    loadOrders();
    setIsStatusModalOpen(false);
    setSelectedOrder(null);
    showSuccess(t("orders.success.statusUpdated") || "Order status updated successfully");
  };

  const handleOrderUpdate = (updatedOrder: Order) => {
    // Update the order in the list
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === updatedOrder.id ? updatedOrder : order
      )
    );
    // Update selected order if it's the same one
    if (selectedOrder && selectedOrder.id === updatedOrder.id) {
      setSelectedOrder(updatedOrder);
    }
=======
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotification();

  const {
    searchQuery,
    statusFilter,
    selectedStoreId,
    currentPage,
    itemsPerPage,
    selectedOrder,
    isStatusModalOpen,
    isDetailModalOpen,
    accessibleStores,
  } = useAppSelector((state) => state.orders);
  const currentUser = useAppSelector((state) => state.auth.user);

  // RTK Query hooks
  const {
    data: ordersData,
    isLoading: loading,
    refetch: refetchOrders,
  } = useGetAllOrdersQuery({
    status: statusFilter || undefined,
    limit: itemsPerPage,
    offset: (currentPage - 1) * itemsPerPage,
  });

  const { data: myStores } = useGetMyStoresForOrdersQuery(undefined, {
    skip: currentUser?.role === "admin",
  });

  const { data: allStores } = useGetAllStoresQuery(undefined, {
    skip: currentUser?.role !== "admin",
  });

  const orders = ordersData?.orders || [];
  const totalItems = ordersData?.total || 0;

  // Update accessible stores in Redux
  useEffect(() => {
    const stores = currentUser?.role === "admin" ? allStores || [] : myStores || [];
    if (stores.length > 0) {
      dispatch(setAccessibleStores(stores));
    }
  }, [dispatch, allStores, myStores, currentUser?.role]);

  const handleUpdateStatus = (order: any) => {
    dispatch(setSelectedOrder(order));
    dispatch(setIsStatusModalOpen(true));
  };

  const handleViewDetails = (order: any) => {
    dispatch(setSelectedOrder(order));
    dispatch(setIsDetailModalOpen(true));
  };

  const handleStatusUpdate = () => {
    refetchOrders();
    dispatch(setIsStatusModalOpen(false));
    dispatch(setSelectedOrder(null));
    showSuccess(t("orders.success.statusUpdated") || "Order status updated successfully");
  };

  const handleOrderUpdate = () => {
    refetchOrders();
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
    showSuccess(t("orders.success.orderUpdated") || "Order updated successfully");
  };

  const handlePageChange = (page: number) => {
<<<<<<< HEAD
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (itemsPerPage: number) => {
    setItemsPerPage(itemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handleModalClose = () => {
    setIsStatusModalOpen(false);
    setIsDetailModalOpen(false);
    setSelectedOrder(null);
  };

  // Filter orders
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.id.toLowerCase().includes(query) ||
          order.storeName.toLowerCase().includes(query) ||
          order.userId.toLowerCase().includes(query) ||
          order.items.some((item) =>
            item.productName.toLowerCase().includes(query)
          )
      );
    }

    return filtered;
  }, [orders, searchQuery]);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search className={styles.searchIcon} />
          <input
            type="text"
            placeholder={t("orders.search.placeholder") || "Search orders..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterBox}>
          <Filter className={styles.filterIcon} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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
=======
    dispatch(setCurrentPage(page));
  };

  const handleItemsPerPageChange = (itemsPerPage: number) => {
    dispatch(setItemsPerPage(itemsPerPage));
  };

  const handleModalClose = () => {
    dispatch(setIsStatusModalOpen(false));
    dispatch(setIsDetailModalOpen(false));
    dispatch(setSelectedOrder(null));
  };

  // Calculate filtered orders count
  const filteredOrdersCount = orders.filter((order) => {
    if (selectedStoreId !== "all") {
      if (order.storeId !== selectedStoreId) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        order.id.toLowerCase().includes(query) ||
        order.storeName.toLowerCase().includes(query) ||
        order.userId.toLowerCase().includes(query) ||
        order.items.some((item) => item.productName.toLowerCase().includes(query))
      );
    }
    return true;
  }).length;

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className={styles.container}>
      <OrderFilters />
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>{t("orders.loading") || "Loading orders..."}</p>
        </div>
<<<<<<< HEAD
      ) : filteredOrders.length === 0 ? (
=======
      ) : filteredOrdersCount === 0 ? (
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
        <div className={styles.empty}>
          <Package className={styles.emptyIcon} />
          <p>{t("orders.empty.noOrders") || "No orders found"}</p>
        </div>
      ) : (
<<<<<<< HEAD
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
                    <div className={styles.totalAmountContainer}>
                      <span className={styles.totalAmount}>
                        {formatCurrency(order.totalAmount - (order.totalRefunded || 0))}
                      </span>
                      {order.totalRefunded && order.totalRefunded > 0 && (
                        <span className={styles.refundedNote}>
                          ({t("orders.modal.originalAmount") || "Original"}: {formatCurrency(order.totalAmount)}, {t("orders.modal.refunded") || "Refunded"}: {formatCurrency(order.totalRefunded)})
                        </span>
                      )}
                    </div>
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
                        onClick={() => handleViewDetails(order)}
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
=======
        <>
          <OrderTable onUpdateStatus={handleUpdateStatus} onViewDetails={handleViewDetails} />
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
<<<<<<< HEAD
        </div>
=======
        </>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
      )}

      {isStatusModalOpen && selectedOrder && (
        <OrderStatusModal
          order={selectedOrder}
          onClose={handleModalClose}
          onUpdate={handleStatusUpdate}
        />
      )}

      {isDetailModalOpen && selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={handleModalClose}
          onOrderUpdate={handleOrderUpdate}
        />
      )}
    </div>
  );
};

export default OrdersManagement;
<<<<<<< HEAD

=======
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
