import React from 'react';
import { Edit2, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../../store/hooks';
import type { Order } from '../../../services/api';
import styles from '../OrdersManagement.module.css';

interface OrderTableProps {
  onUpdateStatus: (order: Order) => void;
  onViewDetails: (order: Order) => void;
}

const OrderTable: React.FC<OrderTableProps> = ({ onUpdateStatus, onViewDetails }) => {
  const { t } = useTranslation();
  const { orders, searchQuery, selectedStoreId } = useAppSelector((state) => state.orders);

  const filteredOrders = orders.filter((order) => {
    // Filter by selected store if not "all"
    if (selectedStoreId !== 'all') {
      if (order.storeId !== selectedStoreId) {
        return false;
      }
    }

    // Filter by search query
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
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return styles.statusPendingPayment;
      case 'pending':
        return styles.statusPending;
      case 'processing':
        return styles.statusProcessing;
      case 'shipped':
        return styles.statusShipped;
      case 'delivered':
        return styles.statusDelivered;
      case 'cancelled':
        return styles.statusCancelled;
      default:
        return '';
    }
  };

  const formatStatus = (status: string) => {
    return t(`orders.status.${status}`) || status;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t('orders.table.orderId') || 'Order ID'}</th>
            <th>{t('orders.table.store') || 'Store'}</th>
            <th>{t('orders.table.items') || 'Items'}</th>
            <th>{t('orders.table.total') || 'Total'}</th>
            <th>{t('orders.table.status') || 'Status'}</th>
            <th>{t('orders.table.date') || 'Date'}</th>
            <th>{t('orders.table.actions') || 'Actions'}</th>
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
                  {order.items.length}{' '}
                  {order.items.length === 1
                    ? t('orders.item') || 'item'
                    : t('orders.items') || 'items'}
                </div>
              </td>
              <td>
                <div className={styles.totalAmountContainer}>
                  <span className={styles.totalAmount}>
                    {formatCurrency(order.totalAmount - (order.totalRefunded || 0))}
                  </span>
                  {order.totalRefunded && order.totalRefunded > 0 && (
                    <span className={styles.refundedNote}>
                      ({t('orders.modal.originalAmount') || 'Original'}:{' '}
                      {formatCurrency(order.totalAmount)},{' '}
                      {t('orders.modal.refunded') || 'Refunded'}:{' '}
                      {formatCurrency(order.totalRefunded)})
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
                    onClick={() => onViewDetails(order)}
                    className={styles.viewButton}
                    title={t('orders.actions.view') || 'View Details'}
                  >
                    <Eye className={styles.actionIcon} />
                  </button>
                  <button
                    onClick={() => onUpdateStatus(order)}
                    className={styles.editButton}
                    title={t('orders.actions.updateStatus') || 'Update Status'}
                  >
                    <Edit2 className={styles.actionIcon} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrderTable;

