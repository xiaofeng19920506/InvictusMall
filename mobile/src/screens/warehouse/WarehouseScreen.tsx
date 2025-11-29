import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import BarcodeScanner from '../../components/BarcodeScanner';
import PhotoCapture from '../../components/PhotoCapture';
import apiService from '../../services/api';
import authService from '../../services/auth';
import {useNotification} from '../../contexts/NotificationContext';
import type {BarcodeScanResult, Product} from '../../types';

type TabType = 'operations' | 'inventory';

const WarehouseScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('operations');
  
  // Operation states
  const [showScanner, setShowScanner] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [operationType, setOperationType] = useState<'in' | 'out' | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  
  // Inventory check states
  const [showInventoryScanner, setShowInventoryScanner] = useState(false);
  const [checkedProduct, setCheckedProduct] = useState<Product | null>(null);
  const [scanHistory, setScanHistory] = useState<Product[]>([]);
  
  const {showSuccess, showError} = useNotification();

  // Create product modal state
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [createProductBarcode, setCreateProductBarcode] = useState('');
  const [createProductName, setCreateProductName] = useState('');
  const [createProductPrice, setCreateProductPrice] = useState('');
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // Handle create product
  const handleCreateProduct = async () => {
    if (!createProductName.trim() || !createProductPrice.trim()) {
      showError('Please fill in all required fields');
      return;
    }

    const price = parseFloat(createProductPrice);
    if (isNaN(price) || price <= 0) {
      showError('Please enter a valid price');
      return;
    }

    setIsCreatingProduct(true);

    try {
      // Get current user to get storeId
      const currentUser = await authService.getCurrentUser();
      if (!currentUser || !currentUser.storeId) {
        showError('Unable to get store information. Please try logging in again.');
        return;
      }

      const productData = {
        storeId: currentUser.storeId,
        name: createProductName.trim(),
        description: '',
        price: price,
        barcode: createProductBarcode,
        stockQuantity: 0,
        category: '',
        isActive: true,
      };

      const response = await apiService.createProduct(productData);

      if (response.success && response.data) {
        showSuccess('Product created successfully!');
        const newProduct = response.data;
        
        // If we were in operation mode, set as selected product
        if (operationType) {
          setSelectedProduct(newProduct);
        } else {
          // If we were in inventory check mode, set as checked product
          setCheckedProduct(newProduct);
          // Add to scan history
          setScanHistory(prev => {
            const exists = prev.some(p => p.id === newProduct.id);
            if (!exists) {
              return [newProduct, ...prev].slice(0, 10);
            }
            return prev;
          });
        }
        
        setShowCreateProductModal(false);
        setCreateProductName('');
        setCreateProductPrice('');
        setCreateProductBarcode('');
      } else {
        showError(response.message || 'Failed to create product');
      }
    } catch (error: any) {
      console.error('Error creating product:', error);
      showError(error.message || 'Failed to create product');
    } finally {
      setIsCreatingProduct(false);
    }
  };

  // Handle photo capture for stock in
  const handlePhotoTaken = async (imageUri: string) => {
    setShowPhotoCapture(false);
    setIsProcessingOCR(true);

    try {
      console.log('[WarehouseScreen] 📷 Photo taken, starting OCR...');
      
      // Extract text from image using OCR
      const ocrResponse = await apiService.extractTextFromImage(imageUri);
      
      if (!ocrResponse.success || !ocrResponse.data) {
        showError('Failed to extract text from image');
        setIsProcessingOCR(false);
        return;
      }

      const { text, parsed } = ocrResponse.data;
      console.log('[WarehouseScreen] 📝 OCR result:', {
        text: text.substring(0, 100),
        parsed,
      });

      // Try to find product by barcode first
      let product: Product | null = null;
      
      if (parsed.barcode) {
        console.log('[WarehouseScreen] 🔍 Searching product by barcode:', parsed.barcode);
        try {
          const barcodeResponse = await apiService.getProductByBarcode(parsed.barcode);
          if (barcodeResponse.success && barcodeResponse.data) {
            product = barcodeResponse.data;
            console.log('[WarehouseScreen] ✅ Product found by barcode:', product.name);
          }
        } catch (error) {
          console.log('[WarehouseScreen] ⚠️ Product not found by barcode');
        }
      }

      // If product found, set it and continue with stock operation
      if (product) {
        setSelectedProduct(product);
        showSuccess(`Product found: ${product.name}`);
      } else {
        // Product not found, open create product modal with OCR data
        console.log('[WarehouseScreen] 📝 Product not found, opening create modal');
        setCreateProductBarcode(parsed.barcode || '');
        setCreateProductName(parsed.name || '');
        setCreateProductPrice(parsed.price ? parsed.price.toString() : '');
        setShowCreateProductModal(true);
      }
    } catch (error: any) {
      console.error('[WarehouseScreen] ❌ OCR processing error:', error);
      showError(error.message || 'Failed to process image');
    } finally {
      setIsProcessingOCR(false);
    }
  };

  // Handle scan for operations
  const handleOperationScan = async (result: BarcodeScanResult) => {
    console.log('[WarehouseScreen] 📦 Operation scan result received:', {
      type: result.type,
      value: result.value,
      hasData: !!result.data,
      productId: result.type === 'product' ? (result.data as Product)?.id : undefined,
      productName: result.type === 'product' ? (result.data as Product)?.name : undefined,
    });

    setShowScanner(false);
    
    if (result.type === 'product' && result.data) {
      const product = result.data as Product;
      console.log('[WarehouseScreen] ✅ Product found for operation:', product.name);
      setSelectedProduct(product);
    } else if (result.type === 'product_not_found') {
      console.log('[WarehouseScreen] 📝 Product not found, opening create modal:', result.value);
      // Open create product modal with pre-filled barcode
      setCreateProductBarcode(result.value);
      setCreateProductName('');
      setCreateProductPrice('');
      setShowCreateProductModal(true);
    } else if (result.type === 'unknown') {
      console.log('[WarehouseScreen] ❓ Unknown barcode scanned:', result.value);
      showError(`Barcode "${result.value}" is not recognized. Please scan a valid product barcode.`);
    } else {
      console.warn('[WarehouseScreen] ⚠️ Invalid scan result for operation:', result.type);
      showError('Please scan a product barcode');
    }
  };

  // Handle scan for inventory check
  const handleInventoryScan = async (result: BarcodeScanResult) => {
    console.log('[WarehouseScreen] 🔍 Inventory scan result received:', {
      type: result.type,
      value: result.value,
      hasData: !!result.data,
      productId: result.type === 'product' ? (result.data as Product)?.id : undefined,
      productName: result.type === 'product' ? (result.data as Product)?.name : undefined,
    });

    setShowInventoryScanner(false);
    
    if (result.type === 'product' && result.data) {
      const product = result.data as Product;
      console.log('[WarehouseScreen] ✅ Product found for inventory check:', product.name);
      setCheckedProduct(product);
      
      // Add to scan history if not already present
      setScanHistory(prev => {
        const exists = prev.some(p => p.id === product.id);
        if (!exists) {
          const newHistory = [product, ...prev].slice(0, 10); // Keep last 10 scans
          console.log('[WarehouseScreen] 📝 Added to scan history, total items:', newHistory.length);
          return newHistory;
        } else {
          console.log('[WarehouseScreen] ℹ️ Product already in scan history, skipping');
          return prev;
        }
      });
    } else if (result.type === 'product_not_found') {
      console.log('[WarehouseScreen] 📝 Product not found in inventory check, opening create modal:', result.value);
      // Open create product modal with pre-filled barcode
      setCreateProductBarcode(result.value);
      setCreateProductName('');
      setCreateProductPrice('');
      setShowCreateProductModal(true);
    } else if (result.type === 'unknown') {
      console.log('[WarehouseScreen] ❓ Unknown barcode scanned:', result.value);
      showError(`Barcode "${result.value}" is not recognized. Please scan a valid product barcode.`);
    } else {
      console.warn('[WarehouseScreen] ⚠️ Invalid scan result for inventory check:', result.type);
      showError('Please scan a product barcode');
    }
  };

  const handleOperation = async () => {
    if (!selectedProduct || !operationType || !quantity) {
      showError('Please fill in all required fields');
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      showError('Please enter a valid quantity');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await apiService.createStockOperation({
        productId: selectedProduct.id,
        type: operationType,
        quantity: qty,
        reason: reason || undefined,
      });

      if (result.success && result.data) {
        let message = `Stock ${operationType === 'in' ? 'In' : 'Out'} operation completed`;
        
        // If order was updated, show additional info
        if (result.data.orderUpdated && result.data.orderStatus) {
          message += `. Order status updated to ${result.data.orderStatus}`;
        }
        
        showSuccess(message);
        setSelectedProduct(null);
        setQuantity('');
        setReason('');
        setOperationType(null);
      } else {
        showError(result.error || 'Operation failed');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Operation failed';
      showError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearCheckedProduct = () => {
    setCheckedProduct(null);
  };

  const clearHistory = () => {
    setScanHistory([]);
  };

  const selectFromHistory = (product: Product) => {
    setCheckedProduct(product);
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
      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'operations' && styles.activeTab]}
          onPress={() => setActiveTab('operations')}>
          <MaterialIcons
            name="inventory"
            size={20}
            color={activeTab === 'operations' ? '#007AFF' : '#8E8E93'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'operations' && styles.activeTabText,
            ]}>
            Operations
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inventory' && styles.activeTab]}
          onPress={() => setActiveTab('inventory')}>
          <MaterialIcons
            name="search"
            size={20}
            color={activeTab === 'inventory' ? '#007AFF' : '#8E8E93'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'inventory' && styles.activeTabText,
            ]}>
            Check Inventory
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Operations Tab */}
        {activeTab === 'operations' && (
          <>
            <View style={styles.operationButtons}>
              <TouchableOpacity
                style={[styles.operationButton, styles.inButton]}
                onPress={() => {
                  setOperationType('in');
                  setShowPhotoCapture(true);
                }}>
                <MaterialIcons name="add" size={32} color="#fff" />
                <Text style={styles.operationButtonText}>Stock In</Text>
                <Text style={styles.operationButtonSubtext}>入库 (拍照识别)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.operationButton, styles.outButton]}
                onPress={() => {
                  setOperationType('out');
                  setShowScanner(true);
                }}>
                <MaterialIcons name="remove" size={32} color="#fff" />
                <Text style={styles.operationButtonText}>Stock Out</Text>
                <Text style={styles.operationButtonSubtext}>出库</Text>
              </TouchableOpacity>
            </View>

            {selectedProduct && operationType && (
              <View style={styles.formContainer}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{selectedProduct.name}</Text>
                  {selectedProduct.barcode && (
                    <Text style={styles.productBarcode}>
                      Barcode: {selectedProduct.barcode}
                    </Text>
                  )}
                  <Text style={styles.productStock}>
                    Current Stock: {selectedProduct.stockQuantity}
                  </Text>
                </View>

                <View style={styles.form}>
                  <Text style={styles.label}>
                    Quantity {operationType === 'in' ? '(In)' : '(Out)'} *
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    placeholder="Enter quantity"
                  />

                  <Text style={styles.label}>Reason (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Enter reason for this operation"
                    multiline
                    numberOfLines={3}
                  />

                  <TouchableOpacity
                    style={[styles.submitButton, isProcessing && styles.submitButtonDisabled]}
                    onPress={handleOperation}
                    disabled={isProcessing}>
                    <Text style={styles.submitButtonText}>
                      {isProcessing ? 'Processing...' : 'Confirm Operation'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setSelectedProduct(null);
                      setQuantity('');
                      setReason('');
                      setOperationType(null);
                    }}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}

        {/* Inventory Check Tab */}
        {activeTab === 'inventory' && (
          <>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => setShowInventoryScanner(true)}>
              <MaterialIcons name="qr-code-scanner" size={32} color="#fff" />
              <Text style={styles.scanButtonText}>Scan Product Barcode</Text>
              <Text style={styles.scanButtonSubtext}>扫描商品条码</Text>
            </TouchableOpacity>

            {checkedProduct && (
              <View style={styles.productCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Product Details</Text>
                  <TouchableOpacity onPress={clearCheckedProduct}>
                    <MaterialIcons name="close" size={24} color="#8E8E93" />
                  </TouchableOpacity>
                </View>

                <View style={styles.productInfo}>
                  {((checkedProduct as any).imageUrls && 
                    Array.isArray((checkedProduct as any).imageUrls) && 
                    (checkedProduct as any).imageUrls.length > 0) || checkedProduct.imageUrl ? (
                    <Image
                      source={{
                        uri:
                          ((checkedProduct as any).imageUrls &&
                            Array.isArray((checkedProduct as any).imageUrls) &&
                            (checkedProduct as any).imageUrls.length > 0)
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
                              checkedProduct.stockQuantity || 0,
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

            {!checkedProduct && scanHistory.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialIcons name="inventory" size={64} color="#C7C7CC" />
                <Text style={styles.emptyStateText}>No products scanned yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Tap the button above to scan a product barcode
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Operation Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}>
        <BarcodeScanner
          onScan={handleOperationScan}
          onClose={() => setShowScanner(false)}
          title={`Scan Product for Stock ${operationType === 'in' ? 'In' : 'Out'}`}
          description="Point the camera at a product barcode"
        />
      </Modal>

      {/* Inventory Scanner Modal */}
      <Modal
        visible={showInventoryScanner}
        animationType="slide"
        onRequestClose={() => setShowInventoryScanner(false)}>
        <BarcodeScanner
          onScan={handleInventoryScan}
          onClose={() => setShowInventoryScanner(false)}
          title="Scan Product to Check Inventory"
          description="Point the camera at a product barcode"
        />
      </Modal>

      {/* Photo Capture Modal */}
      {showPhotoCapture && (
        <PhotoCapture
          onPhotoTaken={handlePhotoTaken}
          onClose={() => {
            setShowPhotoCapture(false);
            setOperationType(null);
          }}
          title="Take Product Photo"
          description="Take a photo of the product label or packaging to extract product information"
        />
      )}

      {/* OCR Processing Indicator */}
      {isProcessingOCR && (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={styles.processingOverlay}>
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.processingText}>Processing image...</Text>
              <Text style={styles.processingSubtext}>Extracting product information</Text>
            </View>
          </View>
        </Modal>
      )}

      {/* Create Product Modal */}
      <Modal
        visible={showCreateProductModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          if (!isCreatingProduct) {
            setShowCreateProductModal(false);
            setCreateProductName('');
            setCreateProductPrice('');
            setCreateProductBarcode('');
          }
        }}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Product</Text>
            <TouchableOpacity
              onPress={() => {
                if (!isCreatingProduct) {
                  setShowCreateProductModal(false);
                  setCreateProductName('');
                  setCreateProductPrice('');
                  setCreateProductBarcode('');
                }
              }}
              disabled={isCreatingProduct}>
              <MaterialIcons name="close" size={28} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Product with barcode "{createProductBarcode}" was not found. Please fill in the details to create a new product.
            </Text>

            <View style={styles.modalForm}>
              <Text style={styles.label}>Barcode *</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={createProductBarcode}
                editable={false}
                placeholder="Scanned barcode"
              />

              <Text style={styles.label}>Product Name *</Text>
              <TextInput
                style={styles.input}
                value={createProductName}
                onChangeText={setCreateProductName}
                placeholder="Enter product name"
                autoCapitalize="words"
                editable={!isCreatingProduct}
              />

              <Text style={styles.label}>Price *</Text>
              <TextInput
                style={styles.input}
                value={createProductPrice}
                onChangeText={setCreateProductPrice}
                placeholder="Enter price (e.g., 19.99)"
                keyboardType="decimal-pad"
                editable={!isCreatingProduct}
              />

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isCreatingProduct && styles.submitButtonDisabled,
                ]}
                onPress={handleCreateProduct}
                disabled={isCreatingProduct || !createProductName.trim() || !createProductPrice.trim()}>
                <Text style={styles.submitButtonText}>
                  {isCreatingProduct ? 'Creating...' : 'Create Product'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  if (!isCreatingProduct) {
                    setShowCreateProductModal(false);
                    setCreateProductName('');
                    setCreateProductPrice('');
                    setCreateProductBarcode('');
                  }
                }}
                disabled={isCreatingProduct}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#E3F2FD',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  operationButtons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  operationButton: {
    flex: 1,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  inButton: {
    backgroundColor: '#34C759',
  },
  outButton: {
    backgroundColor: '#FF3B30',
  },
  operationButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  operationButtonSubtext: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 4,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  productInfo: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    paddingBottom: 16,
    marginBottom: 16,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  productBarcode: {
    fontSize: 14,
    color: '#8E8E93',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  productStock: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  form: {
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#8E8E93',
    fontSize: 16,
  },
  // Create Product Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalForm: {
    flex: 1,
  },
  disabledInput: {
    backgroundColor: '#F5F5F5',
    color: '#8E8E93',
  },
  // OCR Processing styles
  processingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    minWidth: 200,
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  processingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#8E8E93',
  },
  // Inventory check styles
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
  productImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
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

export default WarehouseScreen;
