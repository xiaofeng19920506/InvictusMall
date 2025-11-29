import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import type { Product } from '../../../types';

interface StockOperationFormProps {
  product: Product;
  operationType: 'in' | 'out';
  quantity: string;
  reason: string;
  serialNumber: string;
  isProcessing: boolean;
  onQuantityChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onSerialNumberChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const StockOperationForm: React.FC<StockOperationFormProps> = ({
  product,
  operationType,
  quantity,
  reason,
  serialNumber,
  isProcessing,
  onQuantityChange,
  onReasonChange,
  onSerialNumberChange,
  onSubmit,
  onCancel,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{product.name}</Text>
        {product.barcode && (
          <Text style={styles.productBarcode}>Barcode: {product.barcode}</Text>
        )}
        <Text style={styles.productStock}>
          Current Stock: {product.stockQuantity}
        </Text>
      </View>

      <View style={styles.form}>
        {operationType === 'in' && (
          <>
            <Text style={styles.label}>Serial Number (S/N) (Optional)</Text>
            <TextInput
              style={styles.input}
              value={serialNumber}
              onChangeText={onSerialNumberChange}
              placeholder="Enter or scan serial number"
            />
          </>
        )}

        <Text style={styles.label}>
          Quantity {operationType === 'in' ? '(In)' : '(Out)'} *
        </Text>
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={onQuantityChange}
          keyboardType="numeric"
          placeholder="Enter quantity"
        />

        <Text style={styles.label}>Reason (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={reason}
          onChangeText={onReasonChange}
          placeholder="Enter reason for this operation"
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.submitButton, isProcessing && styles.submitButtonDisabled]}
          onPress={onSubmit}
          disabled={isProcessing}>
          <Text style={styles.submitButtonText}>
            {isProcessing ? 'Processing...' : 'Confirm Operation'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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

export default StockOperationForm;

