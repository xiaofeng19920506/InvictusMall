import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';

interface OCRProcessingIndicatorProps {
  visible: boolean;
}

const OCRProcessingIndicator: React.FC<OCRProcessingIndicatorProps> = ({
  visible,
}) => {
  if (!visible) return null;

  return (
    <Modal visible={true} transparent={true} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.text}>Processing image...</Text>
          <Text style={styles.subtext}>Extracting product information</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    minWidth: 200,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  subtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#8E8E93',
  },
});

export default OCRProcessingIndicator;

