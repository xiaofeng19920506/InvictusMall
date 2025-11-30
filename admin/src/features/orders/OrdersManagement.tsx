import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Package } from "lucide-react";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { useNotification } from "../../contexts/NotificationContext";
import Pagination from "../../shared/components/Pagination";
import OrderStatusModal from "./OrderStatusModal";
import OrderDetailModal from "./OrderDetailModal";
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
import styles from "./OrdersManagement.module.css";

const OrdersManagement: React.FC = () => {
  const { t } = useTranslation();
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
    dispatch(
      fetchOrders({
        status: statusFilter || undefined,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      })
    );
    dispatch(setIsStatusModalOpen(false));
    dispatch(setSelectedOrder(null));
    showSuccess(t("orders.success.statusUpdated") || "Order status updated successfully");
  };

  const handleOrderUpdate = (updatedOrder: any) => {
    dispatch(updateOrderInList(updatedOrder));
    showSuccess(t("orders.success.orderUpdated") || "Order updated successfully");
  };

  const handlePageChange = (page: number) => {
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

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>{t("orders.loading") || "Loading orders..."}</p>
        </div>
      ) : filteredOrdersCount === 0 ? (
        <div className={styles.empty}>
          <Package className={styles.emptyIcon} />
          <p>{t("orders.empty.noOrders") || "No orders found"}</p>
        </div>
      ) : (
        <>
          <OrderTable onUpdateStatus={handleUpdateStatus} onViewDetails={handleViewDetails} />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </>
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
