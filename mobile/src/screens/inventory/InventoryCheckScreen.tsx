import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import BarcodeScanner from '../../components/BarcodeScanner';
import apiService from '../../services/api';
import {useNotification} from '../../contexts/NotificationContext';
import type {BarcodeScanResult, Product} from '../../types';

const InventoryCheckScreen: React.FC = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanHistory, setScanHistory] = useState<Product[]>([]);
  const {showError} = useNotification();

  const handleScan = async (result: BarcodeScanResult) => {
    setShowScanner(false);
    
    if (result.type === 'product' && result.data) {
      const product = result.data as Product;
      setSelectedProduct(product);
      
      // Add to scan history if not already present
      setScanHistory(prev => {
        const exists = prev.some(p => p.id === product.id);
        if (!exists) {
          return [product, ...prev].slice(0, 10); // Keep last 10 scans
        }
        return prev;
      });
    } else {
      showError('Please scan a product barcode');
    }
  };

  const clearSelection = () => {
    setSelectedProduct(null);
  };

  const clearHistory = () => {
    setScanHistory([]);
  };

  const selectFromHistory = (product: Product) => {
    setSelectedProduct(product);
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) {
      return {text: 'Out of Stock', color: '#FF3B30'};
    } else if (stock <= 10) {
      return {text: 'Low Stock', color: '#FF9500'};
    } else {
      return {text: 'In Stock', color: '#34C759'};
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => setShowScanner(true)}>
          <MaterialIcons name="qr-code-scanner" size={32} color="#fff" />
          <Text style={styles.scanButtonText}>Scan Product Barcode</Text>
          <Text style={styles.scanButtonSubtext}>扫描商品条码</Text>
        </TouchableOpacity>

        {selectedProduct && (
          <View style={styles.productCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Product Details</Text>
              <TouchableOpacity onPress={clearSelection}>
                <MaterialIcons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <View style={styles.productInfo}>
              {((selectedProduct as any).imageUrls && 
                Array.isArray((selectedProduct as any).imageUrls) && 
                (selectedProduct as any).imageUrls.length > 0) || selectedProduct.imageUrl ? (
                <Image
                  source={{
                    uri:
                      ((selectedProduct as any).imageUrls &&
                        Array.isArray((selectedProduct as any).imageUrls) &&
                        (selectedProduct as any).imageUrls.length > 0)
                        ? (selectedProduct as any).imageUrls[0]
                        : selectedProduct.imageUrl,
                  }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              ) : null}
              
              <Text style={styles.productName}>{selectedProduct.name}</Text>
              
              {selectedProduct.barcode && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Barcode:</Text>
                  <Text style={styles.infoValue}>{selectedProduct.barcode}</Text>
                </View>
              )}
              
              {selectedProduct.price !== undefined && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Price:</Text>
                  <Text style={styles.infoValue}>
                    ${selectedProduct.price.toFixed(2)}
                  </Text>
                </View>
              )}
              
              <View style={styles.stockContainer}>
                <Text style={styles.stockLabel}>Current Stock:</Text>
                <View style={styles.stockValueContainer}>
                  <Text style={styles.stockValue}>
                    {selectedProduct.stockQuantity || 0}
                  </Text>
                  <View
                    style={[
                      styles.stockStatusBadge,
                      {
                        backgroundColor: getStockStatus(
                          selectedProduct.stockQuantity || 0,
                        ).color,
                      },
                    ]}>
                    <Text style={styles.stockStatusText}>
                      {getStockStatus(selectedProduct.stockQuantity || 0).text}
                    </Text>
                  </View>
                </View>
              </View>
              
              {selectedProduct.description && (
                <View style={styles.descriptionContainer}>
                  <Text style={styles.descriptionLabel}>Description:</Text>
                  <Text style={styles.descriptionText}>
                    {selectedProduct.description}
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
              <TouchableOpacity onPress={clearHistory}>
                <Text style={styles.clearHistoryText}>Clear</Text>
              </TouchableOpacity>
            </View>
            
            {scanHistory.map(product => (
              <TouchableOpacity
                key={product.id}
                style={styles.historyItem}
                onPress={() => selectFromHistory(product)}>
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

        {!selectedProduct && scanHistory.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="inventory" size={64} color="#C7C7CC" />
            <Text style={styles.emptyStateText}>No products scanned yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Tap the button above to scan a product barcode
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}>
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
          title="Scan Product to Check Inventory"
          description="Point the camera at a product barcode"
        />
      </Modal>
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
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
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

export default InventoryCheckScreen;

