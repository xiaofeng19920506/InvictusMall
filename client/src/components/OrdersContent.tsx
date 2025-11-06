'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { orderService, Order } from '@/services/order';
import Link from 'next/link';

interface OrdersContentProps {
  initialOrders: Order[];
  initialStatus?: string;
}

export default function OrdersContent({ initialOrders, initialStatus = 'all' }: OrdersContentProps) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus);

  useEffect(() => {
    if (selectedStatus !== initialStatus) {
      fetchOrders();
    }
  }, [selectedStatus]);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await orderService.getOrderHistory({
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        limit: 50,
      });
      if (response.success) {
        setOrders(response.data || []);
      } else {
        setError('Failed to load orders');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
            <p className="text-gray-600 mt-2">
              View and track your order history
            </p>
          </div>

          {/* Filter */}
          <div className="mb-6">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Orders List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading orders...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600 mb-6">
                {selectedStatus !== 'all'
                  ? `You don't have any ${selectedStatus} orders.`
                  : "You haven't placed any orders yet."}
              </p>
              <Link
                href="/"
                className="inline-block bg-orange-500 text-white px-6 py-2 rounded-md hover:bg-orange-600 transition-colors cursor-pointer"
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                    <div>
                      <div className="flex items-center space-x-4 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Order #{order.id.slice(0, 8)}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Placed on {formatDate(order.orderDate)}
                      </p>
                      {order.shippedDate && (
                        <p className="text-sm text-gray-600">
                          Shipped on {formatDate(order.shippedDate)}
                        </p>
                      )}
                      {order.deliveredDate && (
                        <p className="text-sm text-gray-600">
                          Delivered on {formatDate(order.deliveredDate)}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 md:mt-0 text-right">
                      <p className="text-lg font-bold text-gray-900">
                        ${order.totalAmount.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">{order.items.length} item(s)</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-900 mb-2">From: {order.storeName}</p>
                      <div className="space-y-1">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-3">
                              {item.productImage && (
                                <img
                                  src={item.productImage}
                                  alt={item.productName}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              )}
                              <div>
                                <p className="text-gray-900">{item.productName}</p>
                                <p className="text-gray-500">Qty: {item.quantity}</p>
                              </div>
                            </div>
                            <p className="text-gray-900 font-medium">
                              ${item.subtotal.toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {order.trackingNumber && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Tracking Number:</span>{' '}
                          {order.trackingNumber}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 flex space-x-4">
                      <Link
                        href={`/orders/${order.id}`}
                        className="text-sm text-orange-500 hover:text-orange-600 font-medium cursor-pointer"
                      >
                        View Details
                      </Link>
                      {order.status === 'delivered' && (
                        <button className="text-sm text-blue-500 hover:text-blue-600 font-medium cursor-pointer">
                          Write Review
                        </button>
                      )}
                      {order.status === 'shipped' && (
                        <button className="text-sm text-green-500 hover:text-green-600 font-medium cursor-pointer">
                          Track Package
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

