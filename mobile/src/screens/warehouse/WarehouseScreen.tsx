import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import BarcodeScanner from '../../components/BarcodeScanner';
import apiService from '../../services/api';
import {useNotification} from '../../contexts/NotificationContext';
import type {BarcodeScanResult, Product} from '../../types';

const WarehouseScreen: React.FC = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [operationType, setOperationType] = useState<'in' | 'out' | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const {showSuccess, showError} = useNotification();

  const handleScan = async (result: BarcodeScanResult) => {
    setShowScanner(false);
    
    if (result.type === 'product' && result.data) {
      setSelectedProduct(result.data as Product);
    } else {
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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.operationButtons}>
          <TouchableOpacity
            style={[styles.operationButton, styles.inButton]}
            onPress={() => {
              setOperationType('in');
              setShowScanner(true);
            }}>
            <MaterialIcons name="add" size={32} color="#fff" />
            <Text style={styles.operationButtonText}>Stock In</Text>
            <Text style={styles.operationButtonSubtext}>入库</Text>
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
      </ScrollView>

      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}>
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
          title={`Scan Product for Stock ${operationType === 'in' ? 'In' : 'Out'}`}
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
});

export default WarehouseScreen;

