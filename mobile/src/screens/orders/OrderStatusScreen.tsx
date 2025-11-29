import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import apiService from '../../services/api';
import {useNotification} from '../../contexts/NotificationContext';
import type {Order} from '../../types';

const OrderStatusScreen: React.FC = () => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const {showError} = useNotification();

  const handleSearch = async () => {
    if (!trackingNumber.trim()) {
      showError('Please enter a tracking number or order ID');
      return;
    }

    setLoading(true);
    setOrder(null);
    
    try {
      // Try to fetch order by ID (tracking number might be order ID)
      const response = await apiService.getOrderById(trackingNumber.trim());
      
      if (response.success && response.data) {
        setOrder(response.data);
      } else {
        showError('Order not found. Please check your tracking number or order ID.');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch order';
      showError(errorMessage || 'Order not found');
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setTrackingNumber('');
    setOrder(null);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return '#FF9500';
      case 'processing':
        return '#007AFF';
      case 'shipped':
        return '#5AC8FA';
      case 'delivered':
        return '#34C759';
      case 'cancelled':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.searchSection}>
          <Text style={styles.title}>Track Your Order</Text>
          <Text style={styles.subtitle}>
            Enter your tracking number or order ID
          </Text>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter tracking number or order ID"
              placeholderTextColor="#8E8E93"
              value={trackingNumber}
              onChangeText={setTrackingNumber}
              editable={!loading}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity
              style={[styles.searchButton, loading && styles.searchButtonDisabled]}
              onPress={handleSearch}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="search" size={24} color="#fff" />
                  <Text style={styles.searchButtonText}>Search</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {order && (
          <View style={styles.orderCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Order Details</Text>
              <TouchableOpacity onPress={clearSearch}>
                <MaterialIcons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <View style={styles.orderInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Order ID:</Text>
                <Text style={styles.infoValue}>{order.id}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Store:</Text>
                <Text style={styles.infoValue}>{order.storeName}</Text>
              </View>

              <View style={styles.statusContainer}>
                <Text style={styles.statusLabel}>Status:</Text>
                <View
                  style={[
                    styles.statusBadge,
                    {backgroundColor: getStatusColor(order.status)},
                  ]}>
                  <Text style={styles.statusText}>
                    {getStatusText(order.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Order Date:</Text>
                <Text style={styles.infoValue}>{formatDate(order.orderDate)}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Amount:</Text>
                <Text style={[styles.infoValue, styles.totalAmount]}>
                  ${order.totalAmount.toFixed(2)}
                </Text>
              </View>

              {order.items && order.items.length > 0 && (
                <View style={styles.itemsContainer}>
                  <Text style={styles.itemsTitle}>Order Items:</Text>
                  {order.items.map((item, index) => (
                    <View key={index} style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.productName}</Text>
                        <Text style={styles.itemQuantity}>
                          Quantity: {item.quantity}
                        </Text>
                      </View>
                      <Text style={styles.itemPrice}>
                        ${(item.price * item.quantity).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {order.shippingAddress && (
                <View style={styles.shippingContainer}>
                  <Text style={styles.shippingTitle}>Shipping Address:</Text>
                  <Text style={styles.shippingText}>
                    {order.shippingAddress.streetAddress || order.shippingAddress.street}
                    {order.shippingAddress.aptNumber &&
                      `, ${order.shippingAddress.aptNumber}`}
                    {'\n'}
                    {order.shippingAddress.city}, {order.shippingAddress.stateProvince || order.shippingAddress.state}{' '}
                    {order.shippingAddress.zipCode}
                    {'\n'}
                    {order.shippingAddress.country}
                  </Text>
                </View>
              )}

              {order.trackingNumber && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tracking Number:</Text>
                  <Text style={styles.infoValue}>{order.trackingNumber}</Text>
                </View>
              )}

              {order.shippedDate && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Shipped Date:</Text>
                  <Text style={styles.infoValue}>{formatDate(order.shippedDate)}</Text>
                </View>
              )}

              {order.deliveredDate && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Delivered Date:</Text>
                  <Text style={styles.infoValue}>{formatDate(order.deliveredDate)}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {!order && !loading && (
          <View style={styles.emptyState}>
            <MaterialIcons name="local-shipping" size={64} color="#C7C7CC" />
            <Text style={styles.emptyStateText}>
              Enter a tracking number or order ID to get started
            </Text>
            <Text style={styles.emptyStateSubtext}>
              You can find your order ID in your order confirmation email
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchSection: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    minWidth: 100,
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  orderInfo: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  infoLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
  totalAmount: {
    fontSize: 18,
    color: '#007AFF',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  statusLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  itemsContainer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#8E8E93',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  shippingContainer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  shippingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  shippingText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default OrderStatusScreen;

