import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import apiService from '../../services/api';
import {useNotification} from '../../contexts/NotificationContext';
import type {Shipment} from '../../types';

const ShippingScreen: React.FC = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const {showError} = useNotification();

  useEffect(() => {
    loadShipments();
  }, []);

  const loadShipments = async () => {
    try {
      const response = await apiService.getAllShipments({limit: 50, offset: 0});
      if (response.success && response.data) {
        setShipments(response.data.shipments);
      }
    } catch (error: any) {
      showError(error.message || 'Failed to load shipments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadShipments();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return '#34C759';
      case 'in_transit':
        return '#007AFF';
      case 'pending':
        return '#FF9500';
      case 'cancelled':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const renderShipment = ({item}: {item: Shipment}) => (
    <TouchableOpacity style={styles.shipmentCard}>
      <View style={styles.shipmentHeader}>
        <View style={styles.shipmentInfo}>
          <Text style={styles.trackingNumber}>{item.trackingNumber}</Text>
          <Text style={styles.orderId}>Order: {item.orderId.slice(0, 8)}...</Text>
        </View>
        <View
          style={[styles.statusBadge, {backgroundColor: getStatusColor(item.status)}]}>
          <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
        </View>
      </View>
      <View style={styles.shipmentDetails}>
        <Text style={styles.carrier}>{item.carrierName}</Text>
        {item.estimatedDeliveryDate && (
          <Text style={styles.date}>
            ETA: {new Date(item.estimatedDeliveryDate).toLocaleDateString()}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={shipments}
        renderItem={renderShipment}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="local-shipping" size={64} color="#8E8E93" />
            <Text style={styles.emptyText}>No shipments found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  shipmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  shipmentInfo: {
    flex: 1,
  },
  trackingNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  orderId: {
    fontSize: 14,
    color: '#8E8E93',
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
    textTransform: 'capitalize',
  },
  shipmentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  carrier: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  date: {
    fontSize: 14,
    color: '#8E8E93',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
  },
});

export default ShippingScreen;

