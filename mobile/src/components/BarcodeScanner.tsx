import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import {CameraView, useCameraPermissions, BarcodeScanningResult} from 'expo-camera';
import Constants from 'expo-constants';
import type {BarcodeScanResult} from '../types';

interface BarcodeScannerProps {
  onScan: (result: BarcodeScanResult) => void;
  onClose: () => void;
  title?: string;
  description?: string;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScan,
  onClose,
  title = 'Scan Barcode',
  description = 'Point the camera at a barcode',
}) => {
  const [isActive, setIsActive] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [isSimulator, setIsSimulator] = useState<boolean>(false);
  const [manualBarcode, setManualBarcode] = useState('');
  
  // Simple simulator detection - only check if explicitly a simulator
  useEffect(() => {
    // Only treat as simulator if explicitly detected as one
    const checkSimulator = () => {
      if (Platform.OS === 'ios') {
        const deviceId = Constants.deviceId || '';
        // Only mark as simulator if deviceId explicitly contains "Simulator"
        if (deviceId.includes('Simulator')) {
          setIsSimulator(true);
          return;
        }
      }
      // On real devices, Constants.isDevice is true
      // Only mark as simulator if explicitly false
      if (Constants.isDevice === false) {
        setIsSimulator(true);
        return;
      }
      setIsSimulator(false);
    };
    checkSimulator();
  }, []);

  const handleBarCodeScanned = (scanningResult: BarcodeScanningResult) => {
    if (isProcessing || !isActive) return;

    setIsProcessing(true);
    setIsActive(false);

    const scannedCode = scanningResult.data;
    if (scannedCode) {
      // Process barcode asynchronously
      (async () => {
        try {
          // Import analyzeBarcode dynamically to avoid circular dependency
          const {analyzeBarcode} = await import('../utils/barcodeScanner');
          const result = await analyzeBarcode(scannedCode);
          
          if (result) {
            onScan(result);
            // Reset after a short delay to allow another scan
            setTimeout(() => {
              setIsActive(true);
              setIsProcessing(false);
            }, 1000);
          } else {
            Alert.alert('Error', 'Could not analyze barcode');
            setIsActive(true);
            setIsProcessing(false);
          }
        } catch (error) {
          console.error('Error processing barcode:', error);
          Alert.alert('Error', 'Failed to process barcode');
          setIsActive(true);
          setIsProcessing(false);
        }
      })();
    } else {
      setIsActive(true);
      setIsProcessing(false);
    }
  };

  // Simulator mode: Show manual input option
  const handleManualSubmit = async () => {
    if (!manualBarcode.trim()) {
      Alert.alert('Error', 'Please enter a barcode');
      return;
    }
    
    setIsProcessing(true);
    try {
      const {analyzeBarcode} = await import('../utils/barcodeScanner');
      const result = await analyzeBarcode(manualBarcode.trim());
      
      if (result) {
        onScan(result);
        setManualBarcode('');
        setIsProcessing(false);
      } else {
        Alert.alert('Error', 'Could not analyze barcode');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error processing barcode:', error);
      Alert.alert('Error', 'Failed to process barcode');
      setIsProcessing(false);
    }
  };

  // Request permission automatically on mount for real devices
  useEffect(() => {
    if (!isSimulator && permission && !permission.granted) {
      requestPermission();
    }
  }, [permission, requestPermission, isSimulator]);

  // Show manual input for simulator
  if (isSimulator) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.simulatorContainer}>
          <View style={styles.simulatorIcon}>
            <Text style={styles.simulatorIconText}>📷</Text>
          </View>
          <Text style={styles.simulatorTitle}>Camera Not Available</Text>
          <Text style={styles.simulatorText}>
            {Platform.OS === 'ios' 
              ? 'Cameras are not available in the iOS Simulator. Please use a physical device or enter a barcode manually below.'
              : 'Camera is not available. Please use a physical device or enter a barcode manually below.'}
          </Text>
          
          <View style={styles.manualInputContainer}>
            <TextInput
              style={styles.manualInput}
              placeholder="Enter barcode manually (e.g. 1234567890123)"
              placeholderTextColor="#999"
              value={manualBarcode}
              onChangeText={setManualBarcode}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleManualSubmit}
              editable={!isProcessing}
            />
            <TouchableOpacity
              style={[styles.submitButton, (isProcessing || !manualBarcode.trim()) && styles.submitButtonDisabled]}
              onPress={handleManualSubmit}
              disabled={isProcessing || !manualBarcode.trim()}>
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Check permissions for real device
  if (!permission) {
    // Camera permissions are still loading
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.cameraContainer}>
          <ActivityIndicator size="large" color="#fff" style={{flex: 1, justifyContent: 'center'}} />
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.cameraContainer}>
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionText}>
              Camera permission is required to scan barcodes
            </Text>
            <TouchableOpacity style={styles.button} onPress={requestPermission}>
              <Text style={styles.buttonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={isActive && !isProcessing ? handleBarCodeScanned : undefined}
          enableTorch={false}
          zoom={0}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
          }}
        />
        <View style={styles.overlay}>
          <View style={styles.scanArea} />
        </View>
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>{description}</Text>
        </View>
      </View>

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.processingText}>Processing...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    paddingTop: 50,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#000',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    padding: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 20,
    marginVertical: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  simulatorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  simulatorIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  simulatorIconText: {
    fontSize: 64,
  },
  simulatorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  simulatorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  manualInputContainer: {
    width: '100%',
    maxWidth: 400,
  },
  manualInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#000',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BarcodeScanner;
