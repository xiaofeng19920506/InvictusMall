import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface OperationButtonsProps {
  onStockIn: () => void;
  onStockOut: () => void;
}

const OperationButtons: React.FC<OperationButtonsProps> = ({
  onStockIn,
  onStockOut,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.button, styles.inButton]} onPress={onStockIn}>
        <MaterialIcons name="add" size={32} color="#fff" />
        <Text style={styles.buttonText}>Stock In</Text>
        <Text style={styles.buttonSubtext}>入库 (拍照识别)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.outButton]} onPress={onStockOut}>
        <MaterialIcons name="remove" size={32} color="#fff" />
        <Text style={styles.buttonText}>Stock Out</Text>
        <Text style={styles.buttonSubtext}>出库</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  button: {
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
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  buttonSubtext: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 4,
  },
});

export default OperationButtons;

