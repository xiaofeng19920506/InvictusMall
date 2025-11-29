import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { PendingStockInItem } from '../types';

interface BatchStockInListProps {
  items: PendingStockInItem[];
  isProcessing: boolean;
  onUpdateSerialNumber: (itemId: string, serialNumber: string) => void;
  onRemoveItem: (itemId: string) => void;
  onStockInAll: () => void;
  onContinueScan: () => void;
  onClear: () => void;
}

const BatchStockInList: React.FC<BatchStockInListProps> = ({
  items,
  isProcessing,
  onUpdateSerialNumber,
  onRemoveItem,
  onStockInAll,
  onContinueScan,
  onClear,
}) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Stock In List ({items.length} items)</Text>
        <TouchableOpacity onPress={onClear} style={styles.clearButton}>
          <MaterialIcons name="close" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      {items.map((item, index) => (
        <View key={item.id} style={styles.item}>
          <View style={styles.itemContent}>
            <Text style={styles.itemName} numberOfLines={1}>
              {index + 1}. {item.product.name}
            </Text>
            {item.product.barcode && (
              <Text style={styles.itemBarcode}>{item.product.barcode}</Text>
            )}
            <TextInput
              style={styles.serialNumberInput}
              value={item.serialNumber || ""}
              onChangeText={(sn) => onUpdateSerialNumber(item.id, sn)}
              placeholder="S/N (optional)"
            />
          </View>
          <TouchableOpacity
            onPress={() => onRemoveItem(item.id)}
            style={styles.removeButton}>
            <MaterialIcons name="delete" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity
        style={[
          styles.stockInButton,
          isProcessing && styles.stockInButtonDisabled,
        ]}
        onPress={onStockInAll}
        disabled={isProcessing || items.length === 0}>
        <Text style={styles.stockInButtonText}>
          {isProcessing
            ? "Processing..."
            : `Stock In All (${items.length} items)`}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.continueScanButton}
        onPress={onContinueScan}>
        <MaterialIcons name="camera-alt" size={20} color="#007AFF" />
        <Text style={styles.continueScanButtonText}>Scan Another</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  clearButton: {
    padding: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F7",
  },
  itemContent: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    marginBottom: 4,
  },
  itemBarcode: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 8,
  },
  serialNumberInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    color: "#000",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  removeButton: {
    padding: 8,
  },
  stockInButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  stockInButtonDisabled: {
    backgroundColor: "#C7C7CC",
  },
  stockInButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  continueScanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  continueScanButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default BatchStockInList;

