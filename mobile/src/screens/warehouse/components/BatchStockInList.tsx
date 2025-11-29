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
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onUpdateSerialNumbers: (itemId: string, serialNumbers: string[]) => void;
  onRemoveItem: (itemId: string) => void;
  onStockInAll: () => void;
  onContinueScan: () => void;
  onClear: () => void;
}

const BatchStockInList: React.FC<BatchStockInListProps> = ({
  items,
  isProcessing,
  onUpdateQuantity,
  onUpdateSerialNumbers,
  onRemoveItem,
  onStockInAll,
  onContinueScan,
  onClear,
}) => {
  if (items.length === 0) {
    return null;
  }

  // Calculate total units
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Stock In List ({items.length} product{items.length > 1 ? "s" : ""}, {totalUnits} unit{totalUnits > 1 ? "s" : ""})
        </Text>
        <TouchableOpacity onPress={onClear} style={styles.clearButton}>
          <MaterialIcons name="close" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      {items.map((item, index) => (
        <View key={item.id} style={styles.item}>
          <View style={styles.itemContent}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName} numberOfLines={1}>
                {index + 1}. {item.product.name}
              </Text>
              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  onPress={() =>
                    onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))
                  }
                  style={styles.quantityButton}>
                  <MaterialIcons name="remove" size={18} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{item.quantity}</Text>
                <TouchableOpacity
                  onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  style={styles.quantityButton}>
                  <MaterialIcons name="add" size={18} color="#007AFF" />
                </TouchableOpacity>
              </View>
            </View>
            {item.product.barcode && (
              <Text style={styles.itemBarcode}>{item.product.barcode}</Text>
            )}
            {item.serialNumbers && item.serialNumbers.length > 0 && (
              <View style={styles.serialNumbersContainer}>
                <Text style={styles.serialNumbersLabel}>
                  Serial Numbers ({item.serialNumbers.length}):
                </Text>
                {item.serialNumbers.map((sn, idx) => (
                  <Text key={idx} style={styles.serialNumberText}>
                    • {sn}
                  </Text>
                ))}
              </View>
            )}
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
            : `Stock In All (${totalUnits} unit${totalUnits > 1 ? "s" : ""})`}
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
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    flex: 1,
    marginRight: 12,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    minWidth: 30,
    textAlign: "center",
  },
  itemBarcode: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 8,
  },
  serialNumbersContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
  },
  serialNumbersLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8E8E93",
    marginBottom: 4,
  },
  serialNumberText: {
    fontSize: 12,
    color: "#000",
    marginTop: 2,
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

