import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import BarcodeScanner from '../../components/BarcodeScanner';
import type {BarcodeScanResult} from '../../types';
import { MaterialIcons } from '@expo/vector-icons';

const ScanScreen: React.FC = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<BarcodeScanResult | null>(null);

  const handleScan = (result: BarcodeScanResult) => {
    setScanResult(result);
    setShowScanner(false);
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
  };

  const handleNewScan = () => {
    setScanResult(null);
    setShowScanner(true);
  };

  return (
    <View style={styles.container}>
      {!scanResult && !showScanner && (
        <View style={styles.emptyState}>
          <MaterialIcons name="qr-code-scanner" size={80} color="#8E8E93" />
          <Text style={styles.emptyText}>No scan result</Text>
          <Text style={styles.emptySubtext}>
            Tap the button below to start scanning
          </Text>
          <TouchableOpacity style={styles.scanButton} onPress={() => setShowScanner(true)}>
            <MaterialIcons name="qr-code-scanner" size={24} color="#fff" />
            <Text style={styles.scanButtonText}>Scan Barcode</Text>
          </TouchableOpacity>
        </View>
      )}

      {scanResult && (
        <ScrollView style={styles.resultContainer}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>Scan Result</Text>
            <View style={styles.resultType}>
              <Text style={styles.resultTypeText}>{scanResult.type.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.resultContent}>
            <Text style={styles.resultLabel}>Barcode:</Text>
            <Text style={styles.resultValue}>{scanResult.value}</Text>

            {scanResult.data && (
              <>
                <Text style={styles.resultLabel}>Details:</Text>
                <View style={styles.dataContainer}>
                  <Text style={styles.dataText}>
                    {JSON.stringify(scanResult.data, null, 2)}
                  </Text>
                </View>
              </>
            )}
          </View>

          <TouchableOpacity style={styles.scanButton} onPress={handleNewScan}>
            <MaterialIcons name="qr-code-scanner" size={24} color="#fff" />
            <Text style={styles.scanButtonText}>Scan Again</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={handleCloseScanner}>
        <BarcodeScanner
          onScan={handleScan}
          onClose={handleCloseScanner}
          title="Scan Barcode"
          description="Point the camera at a barcode to scan"
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  scanButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 30,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultContainer: {
    flex: 1,
    padding: 20,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  resultType: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  resultTypeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  resultContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 12,
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 18,
    color: '#000',
    fontFamily: 'monospace',
  },
  dataContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    padding: 12,
    marginTop: 8,
  },
  dataText: {
    fontSize: 12,
    color: '#000',
    fontFamily: 'monospace',
  },
});

export default ScanScreen;

