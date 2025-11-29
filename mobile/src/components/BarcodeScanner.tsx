import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  BarcodeScanningResult,
} from "expo-camera";
import Constants from "expo-constants";
import type { BarcodeScanResult } from "../types";

interface BarcodeScannerProps {
  onScan: (result: BarcodeScanResult) => void;
  onClose: () => void;
  title?: string;
  description?: string;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScan,
  onClose,
  title = "Scan Product Barcode",
  description = "Point the camera at a product barcode",
}) => {
  const [isActive, setIsActive] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [isSimulator, setIsSimulator] = useState<boolean>(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const isMountedRef = useRef(true);
  // Use ref to immediately block duplicate scans (synchronously)
  const isProcessingRef = useRef(false);
  // Track last scanned code and time to prevent duplicate scans
  const lastScannedCodeRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  // Simple simulator detection - only check if explicitly a simulator
  useEffect(() => {
    // Only treat as simulator if explicitly detected as one
    const checkSimulator = () => {
      if (Platform.OS === "ios") {
        const deviceId = Constants.deviceId || "";
        // Only mark as simulator if deviceId explicitly contains "Simulator"
        if (deviceId.includes("Simulator")) {
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
    const scannedCode = scanningResult.data;
    const now = Date.now();

    console.log("[BarcodeScanner] 📷 Scan event received:", {
      scannedCode,
      isProcessingRef: isProcessingRef.current,
      isActive,
      type: scanningResult.type,
    });

    // Immediately check ref (synchronous) to prevent duplicate scans
    if (isProcessingRef.current) {
      console.log(
        "[BarcodeScanner] ⏸️ Scan ignored - already processing (ref check)"
      );
      return;
    }

    // Prevent duplicate scans of the same code within 2 seconds
    if (
      scannedCode &&
      scannedCode === lastScannedCodeRef.current &&
      now - lastScanTimeRef.current < 2000
    ) {
      console.log(
        "[BarcodeScanner] ⏸️ Scan ignored - duplicate scan within 2 seconds"
      );
      return;
    }

    if (!scannedCode) {
      console.warn("[BarcodeScanner] ⚠️ Scan event has no data");
      return;
    }

    // Immediately set ref and update last scan info to block subsequent scans
    isProcessingRef.current = true;
    lastScannedCodeRef.current = scannedCode;
    lastScanTimeRef.current = now;
    setIsProcessing(true);
    setIsActive(false);

    console.log("[BarcodeScanner] 🔍 Processing scanned code:", scannedCode);

    if (scannedCode) {
      // Process barcode asynchronously
      (async () => {
        try {
          console.log(
            "[BarcodeScanner] 📦 Importing analyzeBarcode utility..."
          );
          // Import analyzeBarcode dynamically to avoid circular dependency
          const { analyzeBarcode } = await import("../utils/barcodeScanner");
          console.log(
            "[BarcodeScanner] ✅ analyzeBarcode imported, starting analysis..."
          );

          const result = await analyzeBarcode(scannedCode);
          console.log(
            "[BarcodeScanner] 📊 Analysis result:",
            JSON.stringify(result, null, 2)
          );

          // Always reset processing state - result can be null, unknown, or valid
          isProcessingRef.current = false;
          setIsProcessing(false);
          setIsActive(true);

          if (result && result.type === "product" && result.data) {
            console.log(
              "[BarcodeScanner] ✅ Analysis successful, product found:",
              (result.data as any).name
            );
            // Wait a frame to ensure state update is rendered, then call onScan
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                if (isMountedRef.current) {
                  console.log(
                    "[BarcodeScanner] 📤 Calling onScan callback with product result"
                  );
                  onScan(result);
                } else {
                  console.log(
                    "[BarcodeScanner] ⚠️ Component unmounted, skipping onScan callback"
                  );
                }
              });
            });
          } else if (
            result &&
            (result.type === "unknown" || result.type === "product_not_found")
          ) {
            console.warn(
              "[BarcodeScanner] ⚠️ Product not found for barcode:",
              result.value,
              `type: ${result.type}`
            );
            // Call onScan with unknown/product_not_found result so parent can handle it
            requestAnimationFrame(() => {
              if (isMountedRef.current) {
                console.log(
                  "[BarcodeScanner] 📤 Calling onScan callback with",
                  result.type,
                  "result"
                );
                onScan(result);
              }
            });
          } else if (!result) {
            console.error(
              "[BarcodeScanner] ❌ Analysis returned null/undefined"
            );
            Alert.alert("Error", "Could not analyze barcode");
          } else {
            // Handle other result types (order, tracking, etc.)
            console.log(
              "[BarcodeScanner] 📤 Calling onScan callback with",
              result.type,
              "result"
            );
            requestAnimationFrame(() => {
              if (isMountedRef.current) {
                onScan(result);
              }
            });
          }
        } catch (error) {
          console.error("[BarcodeScanner] ❌ Error processing barcode:", error);
          console.error("[BarcodeScanner] Error details:", {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
          Alert.alert("Error", "Failed to process barcode");
          isProcessingRef.current = false;
          setIsActive(true);
          setIsProcessing(false);
        }
      })();
    } else {
      console.warn("[BarcodeScanner] ⚠️ Scanned code is empty or undefined");
      isProcessingRef.current = false;
      setIsActive(true);
      setIsProcessing(false);
    }
  };

  // Simulator mode: Show manual input option
  const handleManualSubmit = async () => {
    const barcode = manualBarcode.trim();
    console.log(
      "[BarcodeScanner] ⌨️ Manual submit triggered with barcode:",
      barcode
    );

    if (!barcode) {
      console.warn("[BarcodeScanner] ⚠️ Manual submit failed - empty barcode");
      Alert.alert("Error", "Please enter a barcode");
      return;
    }

    // Use ref to immediately block duplicate manual submissions
    if (isProcessingRef.current) {
      console.warn(
        "[BarcodeScanner] ⚠️ Manual submit ignored - already processing"
      );
      return;
    }
    isProcessingRef.current = true;
    setIsProcessing(true);
    console.log("[BarcodeScanner] 🔄 Processing manual barcode input...");

    try {
      const { analyzeBarcode } = await import("../utils/barcodeScanner");
      console.log(
        "[BarcodeScanner] ✅ analyzeBarcode imported for manual input"
      );

      const result = await analyzeBarcode(barcode);
      console.log(
        "[BarcodeScanner] 📊 Manual analysis result:",
        JSON.stringify(result, null, 2)
      );

      if (result) {
        console.log(
          "[BarcodeScanner] ✅ Manual analysis successful, type:",
          result.type
        );
        // Reset processing state before calling onScan
        isProcessingRef.current = false;
        setIsProcessing(false);
        setManualBarcode("");
        // Call onScan callback after state update
        setTimeout(() => {
          if (isMountedRef.current) {
            console.log(
              "[BarcodeScanner] 📤 Calling onScan callback with manual input result"
            );
            onScan(result);
          } else {
            console.log(
              "[BarcodeScanner] ⚠️ Component unmounted, skipping onScan callback"
            );
          }
        }, 50);
      } else {
        console.error(
          "[BarcodeScanner] ❌ Manual analysis returned null/undefined"
        );
        isProcessingRef.current = false;
        Alert.alert("Error", "Could not analyze barcode");
        setIsProcessing(false);
      }
    } catch (error) {
      console.error(
        "[BarcodeScanner] ❌ Error processing manual barcode:",
        error
      );
      console.error("[BarcodeScanner] Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      isProcessingRef.current = false;
      Alert.alert("Error", "Failed to process barcode");
      setIsProcessing(false);
    }
  };

  // Request permission automatically on mount for real devices
  useEffect(() => {
    if (!isSimulator && permission && !permission.granted) {
      requestPermission();
    }
  }, [permission, requestPermission, isSimulator]);

  // Track component mount status and cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    isProcessingRef.current = false;
    return () => {
      isMountedRef.current = false;
      isProcessingRef.current = false;
      lastScannedCodeRef.current = null;
      lastScanTimeRef.current = 0;
      // Cleanup: reset processing state when component unmounts
      setIsProcessing(false);
      setIsActive(true);
    };
  }, []);

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
            {Platform.OS === "ios"
              ? "Cameras are not available in the iOS Simulator. Please use a physical device or enter a barcode manually below."
              : "Camera is not available. Please use a physical device or enter a barcode manually below."}
          </Text>

          <View style={styles.manualInputContainer}>
            <TextInput
              style={styles.manualInput}
              placeholder="Enter product barcode manually (e.g. 1234567890123)"
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
              style={[
                styles.submitButton,
                (isProcessing || !manualBarcode.trim()) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={handleManualSubmit}
              disabled={isProcessing || !manualBarcode.trim()}
            >
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
          <ActivityIndicator
            size="large"
            color="#fff"
            style={{ flex: 1, justifyContent: "center" }}
          />
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
              Camera permission is required to scan product barcodes
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
          onBarcodeScanned={
            isActive && !isProcessing && !isProcessingRef.current
              ? handleBarCodeScanned
              : undefined
          }
          enableTorch={false}
          zoom={0}
          barcodeScannerSettings={{
            barcodeTypes: [
              "ean13",
              "ean8",
              "upc_a",
              "upc_e",
              "code128",
              "code39",
            ], // Product barcode types only, no QR codes
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
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    paddingTop: 50,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 20,
    color: "#000",
  },
  cameraContainer: {
    flex: 1,
    position: "relative",
  },
  camera: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  instructionContainer: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  instructionText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  processingText: {
    color: "#fff",
    marginTop: 16,
    fontSize: 16,
  },
  permissionText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    padding: 20,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 20,
    marginVertical: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  simulatorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  simulatorIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  simulatorIconText: {
    fontSize: 64,
  },
  simulatorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 12,
  },
  simulatorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
  },
  manualInputContainer: {
    width: "100%",
    maxWidth: 400,
  },
  manualInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: "#000",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  submitButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default BarcodeScanner;
