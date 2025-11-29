import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface CreateProductModalProps {
  visible: boolean;
  barcode: string;
  name: string;
  price: string;
  isCreating: boolean;
  onBarcodeChange?: (value: string) => void;
  onNameChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onCreate: () => void;
  onCancel: () => void;
}

const CreateProductModal: React.FC<CreateProductModalProps> = ({
  visible,
  barcode,
  name,
  price,
  isCreating,
  onBarcodeChange,
  onNameChange,
  onPriceChange,
  onCreate,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onCancel}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Create New Product</Text>
          <TouchableOpacity onPress={onCancel} disabled={isCreating}>
            <MaterialIcons name="close" size={28} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.description}>
            {barcode
              ? `Product with barcode "${barcode}" was not found. `
              : ""}
            Please fill in the details to create a new product.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Barcode</Text>
            <TextInput
              style={styles.input}
              value={barcode}
              onChangeText={onBarcodeChange}
              placeholder="Enter barcode (optional)"
              autoCapitalize="characters"
              editable={!isCreating && !!onBarcodeChange}
            />

            <Text style={styles.label}>Product Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={onNameChange}
              placeholder="Enter product name"
              autoCapitalize="words"
              editable={!isCreating}
            />

            <Text style={styles.label}>Price *</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={onPriceChange}
              placeholder="Enter price (e.g., 19.99)"
              keyboardType="decimal-pad"
              editable={!isCreating}
            />

            <TouchableOpacity
              style={[
                styles.submitButton,
                isCreating && styles.submitButtonDisabled,
              ]}
              onPress={onCreate}
              disabled={isCreating || !name.trim() || !price.trim()}>
              <Text style={styles.submitButtonText}>
                {isCreating ? 'Creating...' : 'Create Product'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={isCreating}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  description: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 20,
    lineHeight: 20,
  },
  form: {
    flex: 1,
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
  disabledInput: {
    backgroundColor: '#F5F5F5',
    color: '#8E8E93',
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

export default CreateProductModal;


  },
});

export default CreateProductModal;

