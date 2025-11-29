import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
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
  const [editingItem, setEditingItem] = useState<PendingStockInItem | null>(null);
  const [editQuantity, setEditQuantity] = useState<string>('');
  const [editSerialNumbers, setEditSerialNumbers] = useState<string>('');

  // Calculate total units
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  // Debug log to track updates
  React.useEffect(() => {
    console.log("[BatchStockInList] Items updated:", {
      count: items.length,
      totalUnits,
      items: items.map((item) => ({
        id: item.id,
        name: item.product.name,
        quantity: item.quantity,
      })),
    });
  }, [items, totalUnits]);

  if (items.length === 0) {
    return null;
  }

  const handleEdit = (item: PendingStockInItem) => {
    setEditingItem(item);
    setEditQuantity(item.quantity.toString());
    setEditSerialNumbers(item.serialNumbers?.join('\n') || '');
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;

    const quantity = parseInt(editQuantity, 10);
    if (isNaN(quantity) || quantity < 1) {
      Alert.alert('Invalid Quantity', 'Quantity must be at least 1');
      return;
    }

    const serialNumbersArray = editSerialNumbers
      .split('\n')
      .map((sn) => sn.trim())
      .filter((sn) => sn.length > 0);

    onUpdateQuantity(editingItem.id, quantity);
    onUpdateSerialNumbers(editingItem.id, serialNumbersArray);
    setEditingItem(null);
    setEditQuantity('');
    setEditSerialNumbers('');
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditQuantity('');
    setEditSerialNumbers('');
  };

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
        <View key={`${item.id}-${item.quantity}`} style={styles.item}>
          <View style={styles.itemContent}>
            <View style={styles.itemHeader}>
              <View style={styles.itemNameContainer}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {index + 1}. {item.product.name}
                </Text>
                <Text style={styles.quantityDisplay} key={`qty-${item.id}-${item.quantity}`}>
                  Qty: {item.quantity}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleEdit(item)}
                style={styles.editButton}>
                <MaterialIcons name="edit" size={20} color="#007AFF" />
              </TouchableOpacity>
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

      {/* Edit Modal */}
      <Modal
        visible={editingItem !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancelEdit}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Item</Text>
              <TouchableOpacity onPress={handleCancelEdit}>
                <MaterialIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {editingItem && (
              <>
                <Text style={styles.modalLabel}>
                  Product: {editingItem.product.name}
                </Text>

                <Text style={styles.modalLabel}>Quantity *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editQuantity}
                  onChangeText={setEditQuantity}
                  keyboardType="numeric"
                  placeholder="Enter quantity"
                />

                <Text style={styles.modalLabel}>Serial Numbers (one per line)</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  value={editSerialNumbers}
                  onChangeText={setEditSerialNumbers}
                  multiline
                  numberOfLines={4}
                  placeholder="Enter serial numbers, one per line"
                  textAlignVertical="top"
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={handleCancelEdit}>
                    <Text style={styles.modalButtonCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonSave]}
                    onPress={handleSaveEdit}>
                    <Text style={styles.modalButtonSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  itemNameContainer: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  quantityDisplay: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 2,
  },
  editButton: {
    padding: 8,
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
  // Edit Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
    marginBottom: 8,
    marginTop: 12,
  },
  modalInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#000",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  modalTextArea: {
    height: 100,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonCancel: {
    backgroundColor: "#F0F0F0",
  },
  modalButtonSave: {
    backgroundColor: "#007AFF",
  },
  modalButtonCancelText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  modalButtonSaveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default BatchStockInList;

