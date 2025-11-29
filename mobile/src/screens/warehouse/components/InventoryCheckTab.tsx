import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { Product } from '../../../types';
import { getStockStatus } from '../utils';

interface InventoryCheckTabProps {
  checkedProduct: Product | null;
  scanHistory: Product[];
  onScan: () => void;
  onClearProduct: () => void;
  onClearHistory: () => void;
  onSelectFromHistory: (product: Product) => void;
}

const InventoryCheckTab: React.FC<InventoryCheckTabProps> = ({
  checkedProduct,
  scanHistory,
  onScan,
  onClearProduct,
  onClearHistory,
  onSelectFromHistory,
}) => {
  return (
    <>
      <TouchableOpacity style={styles.scanButton} onPress={onScan}>
        <MaterialIcons name="qr-code-scanner" size={32} color="#fff" />
        <Text style={styles.scanButtonText}>Scan Product Barcode</Text>
        <Text style={styles.scanButtonSubtext}>扫描商品条码</Text>
      </TouchableOpacity>

      {checkedProduct && (
        <View style={styles.productCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Product Details</Text>
            <TouchableOpacity onPress={onClearProduct}>
              <MaterialIcons name="close" size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <View style={styles.productInfo}>
            {((checkedProduct as any).imageUrls &&
              Array.isArray((checkedProduct as any).imageUrls) &&
              (checkedProduct as any).imageUrls.length > 0) ||
            checkedProduct.imageUrl ? (
              <Image
                source={{
                  uri:
                    (checkedProduct as any).imageUrls &&
                    Array.isArray((checkedProduct as any).imageUrls) &&
                    (checkedProduct as any).imageUrls.length > 0
                      ? (checkedProduct as any).imageUrls[0]
                      : checkedProduct.imageUrl,
                }}
                style={styles.productImage}
                resizeMode="cover"
              />
            ) : null}

            <Text style={styles.productName}>{checkedProduct.name}</Text>

            {checkedProduct.barcode && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Barcode:</Text>
                <Text style={styles.infoValue}>{checkedProduct.barcode}</Text>
              </View>
            )}

            {checkedProduct.price !== undefined && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Price:</Text>
                <Text style={styles.infoValue}>
                  ${checkedProduct.price.toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.stockContainer}>
              <Text style={styles.stockLabel}>Current Stock:</Text>
              <View style={styles.stockValueContainer}>
                <Text style={styles.stockValue}>
                  {checkedProduct.stockQuantity || 0}
                </Text>
                <View
                  style={[
                    styles.stockStatusBadge,
                    {
                      backgroundColor: getStockStatus(
                        checkedProduct.stockQuantity || 0
                      ).color,
                    },
                  ]}>
                  <Text style={styles.stockStatusText}>
                    {getStockStatus(checkedProduct.stockQuantity || 0).text}
                  </Text>
                </View>
              </View>
            </View>

            {checkedProduct.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionLabel}>Description:</Text>
                <Text style={styles.descriptionText}>
                  {checkedProduct.description}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {scanHistory.length > 0 && (
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Recent Scans</Text>
            <TouchableOpacity onPress={onClearHistory}>
              <Text style={styles.clearHistoryText}>Clear</Text>
            </TouchableOpacity>
          </View>

          {scanHistory.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.historyItem}
              onPress={() => onSelectFromHistory(product)}>
              <View style={styles.historyItemContent}>
                <Text style={styles.historyItemName}>{product.name}</Text>
                <View style={styles.historyItemStock}>
                  <Text
                    style={[
                      styles.historyItemStockText,
                      {
                        color: getStockStatus(product.stockQuantity || 0).color,
                      },
                    ]}>
                    Stock: {product.stockQuantity || 0}
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#8E8E93" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!checkedProduct && scanHistory.length === 0 && (
        <View style={styles.emptyState}>
          <MaterialIcons name="inventory" size={64} color="#C7C7CC" />
          <Text style={styles.emptyStateText}>No Products Scanned</Text>
          <Text style={styles.emptyStateSubtext}>
            Scan a product barcode to check its inventory
          </Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  scanButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  scanButtonSubtext: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 4,
  },
  productCard: {
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
  productInfo: {
    gap: 12,
  },
  productImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
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
  },
  stockContainer: {
    marginTop: 8,
    padding: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  stockLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
    fontWeight: '500',
  },
  stockValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stockValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  stockStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stockStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  descriptionContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  descriptionLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  historySection: {
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
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  clearHistoryText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  historyItemContent: {
    flex: 1,
  },
  historyItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  historyItemStock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyItemStockText: {
    fontSize: 12,
    fontWeight: '600',
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
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default InventoryCheckTab;

