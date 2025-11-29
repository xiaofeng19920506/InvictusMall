import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Image,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import BarcodeScanner from "../../components/BarcodeScanner";
import PhotoCapture from "../../components/PhotoCapture";
import apiService from "../../services/api";
import authService from "../../services/auth";
import { useNotification } from "../../contexts/NotificationContext";
import type { BarcodeScanResult, Product } from "../../types";
import type { TabType, PendingStockInItem } from "./types";
import { getStockStatus } from "./utils";
import BatchStockInList from "./components/BatchStockInList";
import StockOperationForm from "./components/StockOperationForm";
import InventoryCheckTab from "./components/InventoryCheckTab";
import CreateProductModal from "./components/CreateProductModal";

const WarehouseScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("operations");

  // Operation states
  const [showScanner, setShowScanner] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [operationType, setOperationType] = useState<"in" | "out" | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);

  // Batch scan states for stock in
  const [pendingStockInItems, setPendingStockInItems] = useState<
    PendingStockInItem[]
  >([]);

  // Inventory check states
  const [showInventoryScanner, setShowInventoryScanner] = useState(false);
  const [checkedProduct, setCheckedProduct] = useState<Product | null>(null);
  const [scanHistory, setScanHistory] = useState<Product[]>([]);

  const { showSuccess, showError } = useNotification();

  // Create product modal state
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [createProductBarcode, setCreateProductBarcode] = useState("");
  const [createProductName, setCreateProductName] = useState("");
  const [createProductPrice, setCreateProductPrice] = useState("");
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // Handle create product
  const handleCreateProduct = async () => {
    if (!createProductName.trim() || !createProductPrice.trim()) {
      showError("Please fill in all required fields");
      return;
    }

    const price = parseFloat(createProductPrice);
    if (isNaN(price) || price <= 0) {
      showError("Please enter a valid price");
      return;
    }

    setIsCreatingProduct(true);

    try {
      // Get current user to get storeId
      const currentUser = await authService.getCurrentUser();
      if (!currentUser || !currentUser.storeId) {
        showError(
          "Unable to get store information. Please try logging in again."
        );
        return;
      }

      const productData = {
        storeId: currentUser.storeId,
        name: createProductName.trim(),
        description: "",
        price: price,
        barcode: createProductBarcode,
        stockQuantity: 0,
        category: "",
        isActive: true,
      };

      const response = await apiService.createProduct(productData);

      if (response.success && response.data) {
        showSuccess("Product created successfully!");
        const newProduct = response.data;

        // If we were in operation mode, set as selected product
        if (operationType) {
          setSelectedProduct(newProduct);
          // Serial number should already be set from OCR parsing
        } else {
          // If we were in inventory check mode, set as checked product
          setCheckedProduct(newProduct);
          // Add to scan history
          setScanHistory((prev) => {
            const exists = prev.some((p) => p.id === newProduct.id);
            if (!exists) {
              return [newProduct, ...prev].slice(0, 10);
            }
            return prev;
          });
        }

        setShowCreateProductModal(false);
        setCreateProductName("");
        setCreateProductPrice("");
        setCreateProductBarcode("");
        // Keep serial number if it was set from OCR
      } else {
        showError(response.message || "Failed to create product");
      }
    } catch (error: any) {
      console.error("Error creating product:", error);
      showError(error.message || "Failed to create product");
    } finally {
      setIsCreatingProduct(false);
    }
  };

  // Handle photo capture for stock in
  const handlePhotoTaken = async (imageUri: string) => {
    setShowPhotoCapture(false);
    setIsProcessingOCR(true);

    try {
      console.log("[WarehouseScreen] 📷 Photo taken, starting OCR...");

      // Extract text from image using OCR
      const ocrResponse = await apiService.extractTextFromImage(imageUri);

      if (!ocrResponse.success || !ocrResponse.data) {
        showError("Failed to extract text from image");
        setIsProcessingOCR(false);
        return;
      }

      const { text, parsed } = ocrResponse.data;
      console.log("[WarehouseScreen] 📝 OCR result:", {
        text: text.substring(0, 100),
        parsed,
      });

      // Try to find product by barcode first
      let product: Product | null = null;

      if (parsed.barcode) {
        console.log(
          "[WarehouseScreen] 🔍 Searching product by barcode:",
          parsed.barcode
        );
        try {
          const barcodeResponse = await apiService.getProductByBarcode(
            parsed.barcode
          );
          if (barcodeResponse.success && barcodeResponse.data) {
            product = barcodeResponse.data;
            console.log(
              "[WarehouseScreen] ✅ Product found by barcode:",
              product.name
            );
          }
        } catch (error) {
          console.log("[WarehouseScreen] ⚠️ Product not found by barcode");
        }
      }

      // For stock in: add to batch list (1 unit per scan)
      // For stock out: use old single product flow
      if (product) {
        if (operationType === "in") {
          // Add to pending stock in list (1 unit per scan)
          const newItem: PendingStockInItem = {
            id: `${product.id}-${Date.now()}-${Math.random()}`,
            product: product,
            serialNumber: parsed.serialNumber || undefined,
            scannedAt: new Date(),
          };

          setPendingStockInItems((prev) => {
            const updated = [...prev, newItem];
            showSuccess(
              `${product.name} added (${updated.length} item${
                updated.length > 1 ? "s" : ""
              } in list)`
            );
            return updated;
          });

          // Re-open photo capture for next scan
          setShowPhotoCapture(true);
        } else {
          // Stock out: use old single product flow
          setSelectedProduct(product);
          if (parsed.serialNumber) {
            setSerialNumber(parsed.serialNumber);
          }
          showSuccess(
            `Product found: ${product.name}. Please enter quantity and S/N to stock out.`
          );
        }
      } else {
        // Product not found, open create product modal with OCR data
        console.log(
          "[WarehouseScreen] 📝 Product not found, opening create modal"
        );
        // Extract first meaningful line from OCR text as product name
        let productName = parsed.name;
        if (!productName || productName.length < 3) {
          const textLines = text
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
          productName =
            textLines.find(
              (line) =>
                line.length >= 3 &&
                /[a-zA-Z\u4e00-\u9fa5]/.test(line) &&
                !/^(S\/N|SN|S\/N:|SN:)/i.test(line) &&
                !/^(LR|MNK|Part|Model|Code|SKU|MNK:)/i.test(line)
            ) ||
            textLines[0] ||
            text.substring(0, 100);
        }

        setCreateProductBarcode(parsed.barcode || "");
        setCreateProductName(productName ? productName.trim() : "");
        setCreateProductPrice(parsed.price ? parsed.price.toString() : "");
        // Set serial number if available
        if (parsed.serialNumber) {
          setSerialNumber(parsed.serialNumber);
        }
        setShowCreateProductModal(true);
      }
    } catch (error: any) {
      console.error("[WarehouseScreen] ❌ OCR processing error:", error);
      showError(error.message || "Failed to process image");
    } finally {
      setIsProcessingOCR(false);
    }
  };

  // Handle scan for operations
  const handleOperationScan = async (result: BarcodeScanResult) => {
    console.log("[WarehouseScreen] 📦 Operation scan result received:", {
      type: result.type,
      value: result.value,
      hasData: !!result.data,
      productId:
        result.type === "product" ? (result.data as Product)?.id : undefined,
      productName:
        result.type === "product" ? (result.data as Product)?.name : undefined,
    });

    setShowScanner(false);

    if (result.type === "product" && result.data) {
      const product = result.data as Product;
      console.log(
        "[WarehouseScreen] ✅ Product found for operation:",
        product.name
      );
      setSelectedProduct(product);
    } else if (result.type === "product_not_found") {
      console.log(
        "[WarehouseScreen] 📝 Product not found, opening create modal:",
        result.value
      );
      // Open create product modal with pre-filled barcode
      setCreateProductBarcode(result.value);
      setCreateProductName("");
      setCreateProductPrice("");
      setShowCreateProductModal(true);
    } else if (result.type === "unknown") {
      console.log(
        "[WarehouseScreen] ❓ Unknown barcode scanned:",
        result.value
      );
      showError(
        `Barcode "${result.value}" is not recognized. Please scan a valid product barcode.`
      );
    } else {
      console.warn(
        "[WarehouseScreen] ⚠️ Invalid scan result for operation:",
        result.type
      );
      showError("Please scan a product barcode");
    }
  };

  // Handle scan for inventory check
  const handleInventoryScan = async (result: BarcodeScanResult) => {
    console.log("[WarehouseScreen] 🔍 Inventory scan result received:", {
      type: result.type,
      value: result.value,
      hasData: !!result.data,
      productId:
        result.type === "product" ? (result.data as Product)?.id : undefined,
      productName:
        result.type === "product" ? (result.data as Product)?.name : undefined,
    });

    setShowInventoryScanner(false);

    if (result.type === "product" && result.data) {
      const product = result.data as Product;
      console.log(
        "[WarehouseScreen] ✅ Product found for inventory check:",
        product.name
      );
      setCheckedProduct(product);

      // Add to scan history if not already present
      setScanHistory((prev) => {
        const exists = prev.some((p) => p.id === product.id);
        if (!exists) {
          const newHistory = [product, ...prev].slice(0, 10); // Keep last 10 scans
          console.log(
            "[WarehouseScreen] 📝 Added to scan history, total items:",
            newHistory.length
          );
          return newHistory;
        } else {
          console.log(
            "[WarehouseScreen] ℹ️ Product already in scan history, skipping"
          );
          return prev;
        }
      });
    } else if (result.type === "product_not_found") {
      console.log(
        "[WarehouseScreen] 📝 Product not found in inventory check, opening create modal:",
        result.value
      );
      // Open create product modal with pre-filled barcode
      setCreateProductBarcode(result.value);
      setCreateProductName("");
      setCreateProductPrice("");
      setShowCreateProductModal(true);
    } else if (result.type === "unknown") {
      console.log(
        "[WarehouseScreen] ❓ Unknown barcode scanned:",
        result.value
      );
      showError(
        `Barcode "${result.value}" is not recognized. Please scan a valid product barcode.`
      );
    } else {
      console.warn(
        "[WarehouseScreen] ⚠️ Invalid scan result for inventory check:",
        result.type
      );
      showError("Please scan a product barcode");
    }
  };

  // Handle batch stock in for multiple scanned products
  const handleBatchStockIn = async () => {
    if (pendingStockInItems.length === 0) {
      showError("No items to stock in");
      return;
    }

    setIsProcessing(true);
    try {
      // Create stock operations for each item (1 unit each)
      const operations = pendingStockInItems.map((item) => {
        const reason = item.serialNumber ? `S/N: ${item.serialNumber}` : "";
        return apiService.createStockOperation({
          productId: item.product.id,
          type: "in",
          quantity: 1, // Always 1 unit per scan
          reason: reason || undefined,
        });
      });

      // Execute all operations in parallel
      const results = await Promise.all(operations);
      const failed = results.filter((r) => !r.success);

      if (failed.length === 0) {
        showSuccess(
          `Successfully stocked in ${pendingStockInItems.length} items`
        );
        setPendingStockInItems([]);
        setOperationType(null);
        setShowPhotoCapture(false);
      } else {
        showError(`${failed.length} operations failed. Please try again.`);
      }
    } catch (error: any) {
      showError(error.message || "Batch stock in failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOperation = async () => {
    if (!selectedProduct || !operationType || !quantity) {
      showError("Please fill in all required fields");
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      showError("Please enter a valid quantity");
      return;
    }

    setIsProcessing(true);
    try {
      // Include serial number in reason if provided (for stock in operations)
      let finalReason = reason || "";
      if (operationType === "in" && serialNumber.trim()) {
        finalReason = finalReason
          ? `${finalReason} | S/N: ${serialNumber.trim()}`
          : `S/N: ${serialNumber.trim()}`;
      }

      const result = await apiService.createStockOperation({
        productId: selectedProduct.id,
        type: operationType,
        quantity: qty,
        reason: finalReason || undefined,
      });

      if (result.success && result.data) {
        let message = `Stock ${
          operationType === "in" ? "In" : "Out"
        } operation completed`;

        // If order was updated, show additional info
        if (result.data.orderUpdated && result.data.orderStatus) {
          message += `. Order status updated to ${result.data.orderStatus}`;
        }

        showSuccess(message);
        setSelectedProduct(null);
        setQuantity("");
        setReason("");
        setSerialNumber("");
        setOperationType(null);
      } else {
        showError(result.error || "Operation failed");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || "Operation failed";
      showError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearCheckedProduct = () => {
    setCheckedProduct(null);
  };

  const clearHistory = () => {
    setScanHistory([]);
  };

  const selectFromHistory = (product: Product) => {
    setCheckedProduct(product);
  };

  return (
    <View style={styles.container}>
      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "operations" && styles.activeTab]}
          onPress={() => setActiveTab("operations")}
        >
          <MaterialIcons
            name="inventory"
            size={20}
            color={activeTab === "operations" ? "#007AFF" : "#8E8E93"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "operations" && styles.activeTabText,
            ]}
          >
            Operations
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "inventory" && styles.activeTab]}
          onPress={() => setActiveTab("inventory")}
        >
          <MaterialIcons
            name="search"
            size={20}
            color={activeTab === "inventory" ? "#007AFF" : "#8E8E93"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "inventory" && styles.activeTabText,
            ]}
          >
            Check Inventory
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Operations Tab */}
        {activeTab === "operations" && (
          <>
            <View style={styles.operationButtons}>
              <TouchableOpacity
                style={[styles.operationButton, styles.inButton]}
                onPress={() => {
                  setOperationType("in");
                  setShowPhotoCapture(true);
                }}
              >
                <MaterialIcons name="add" size={32} color="#fff" />
                <Text style={styles.operationButtonText}>Stock In</Text>
                <Text style={styles.operationButtonSubtext}>
                  入库 (拍照识别)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.operationButton, styles.outButton]}
                onPress={() => {
                  setOperationType("out");
                  setShowScanner(true);
                }}
              >
                <MaterialIcons name="remove" size={32} color="#fff" />
                <Text style={styles.operationButtonText}>Stock Out</Text>
                <Text style={styles.operationButtonSubtext}>出库</Text>
              </TouchableOpacity>
            </View>

            {/* Batch Stock In List */}
            {operationType === "in" && (
              <BatchStockInList
                items={pendingStockInItems}
                isProcessing={isProcessing}
                onUpdateSerialNumber={(itemId, serialNumber) => {
                  setPendingStockInItems((prev) =>
                    prev.map((p) =>
                      p.id === itemId ? { ...p, serialNumber } : p
                    )
                  );
                }}
                onRemoveItem={(itemId) => {
                  setPendingStockInItems((prev) =>
                    prev.filter((p) => p.id !== itemId)
                  );
                }}
                onStockInAll={handleBatchStockIn}
                onContinueScan={() => setShowPhotoCapture(true)}
                onClear={() => {
                  setPendingStockInItems([]);
                  setShowPhotoCapture(false);
                  setOperationType(null);
                }}
              />
            )}

            {selectedProduct && operationType && (
              <StockOperationForm
                product={selectedProduct}
                operationType={operationType}
                quantity={quantity}
                reason={reason}
                serialNumber={serialNumber}
                isProcessing={isProcessing}
                onQuantityChange={setQuantity}
                onReasonChange={setReason}
                onSerialNumberChange={setSerialNumber}
                onSubmit={handleOperation}
                onCancel={() => {
                  setSelectedProduct(null);
                  setQuantity("");
                  setReason("");
                  setSerialNumber("");
                  setOperationType(null);
                }}
              />
            )}
          </>
        )}

        {/* Inventory Check Tab */}
        {activeTab === "inventory" && (
          <InventoryCheckTab
            checkedProduct={checkedProduct}
            scanHistory={scanHistory}
            onScan={() => setShowInventoryScanner(true)}
            onClearProduct={clearCheckedProduct}
            onClearHistory={clearHistory}
            onSelectFromHistory={selectFromHistory}
          />
        )}
      </ScrollView>

      {/* Operation Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        <BarcodeScanner
          onScan={handleOperationScan}
          onClose={() => setShowScanner(false)}
          title={`Scan Product for Stock ${
            operationType === "in" ? "In" : "Out"
          }`}
          description="Point the camera at a product barcode"
        />
      </Modal>

      {/* Inventory Scanner Modal */}
      <Modal
        visible={showInventoryScanner}
        animationType="slide"
        onRequestClose={() => setShowInventoryScanner(false)}
      >
        <BarcodeScanner
          onScan={handleInventoryScan}
          onClose={() => setShowInventoryScanner(false)}
          title="Scan Product to Check Inventory"
          description="Point the camera at a product barcode"
        />
      </Modal>

      {/* Photo Capture Modal */}
      {showPhotoCapture && (
        <PhotoCapture
          onPhotoTaken={handlePhotoTaken}
          onClose={() => {
            setShowPhotoCapture(false);
            setOperationType(null);
          }}
          title="Take Product Photo"
          description="Take a photo of the product label or packaging to extract product information"
        />
      )}

      {/* OCR Processing Indicator */}
      {isProcessingOCR && (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={styles.processingOverlay}>
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.processingText}>Processing image...</Text>
              <Text style={styles.processingSubtext}>
                Extracting product information
              </Text>
            </View>
          </View>
        </Modal>
      )}

      {/* Create Product Modal */}
      <Modal
        visible={showCreateProductModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          if (!isCreatingProduct) {
            setShowCreateProductModal(false);
            setCreateProductName("");
            setCreateProductPrice("");
            setCreateProductBarcode("");
          }
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Product</Text>
            <TouchableOpacity
              onPress={() => {
                if (!isCreatingProduct) {
                  setShowCreateProductModal(false);
                  setCreateProductName("");
                  setCreateProductPrice("");
                  setCreateProductBarcode("");
                }
              }}
              disabled={isCreatingProduct}
            >
              <MaterialIcons name="close" size={28} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Product with barcode "{createProductBarcode}" was not found.
              Please fill in the details to create a new product.
            </Text>

            <View style={styles.modalForm}>
              <Text style={styles.label}>Barcode *</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={createProductBarcode}
                editable={false}
                placeholder="Scanned barcode"
              />

              <Text style={styles.label}>Product Name *</Text>
              <TextInput
                style={styles.input}
                value={createProductName}
                onChangeText={setCreateProductName}
                placeholder="Enter product name"
                autoCapitalize="words"
                editable={!isCreatingProduct}
              />

              <Text style={styles.label}>Price *</Text>
              <TextInput
                style={styles.input}
                value={createProductPrice}
                onChangeText={setCreateProductPrice}
                placeholder="Enter price (e.g., 19.99)"
                keyboardType="decimal-pad"
                editable={!isCreatingProduct}
              />

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isCreatingProduct && styles.submitButtonDisabled,
                ]}
                onPress={handleCreateProduct}
                disabled={
                  isCreatingProduct ||
                  !createProductName.trim() ||
                  !createProductPrice.trim()
                }
              >
                <Text style={styles.submitButtonText}>
                  {isCreatingProduct ? "Creating..." : "Create Product"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  if (!isCreatingProduct) {
                    setShowCreateProductModal(false);
                    setCreateProductName("");
                    setCreateProductPrice("");
                    setCreateProductBarcode("");
                  }
                }}
                disabled={isCreatingProduct}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: "#E3F2FD",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#8E8E93",
  },
  activeTabText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  operationButtons: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  operationButton: {
    flex: 1,
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
  inButton: {
    backgroundColor: "#34C759",
  },
  outButton: {
    backgroundColor: "#FF3B30",
  },
  operationButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 8,
  },
  operationButtonSubtext: {
    color: "#fff",
    fontSize: 14,
    opacity: 0.9,
    marginTop: 4,
  },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  productInfo: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
    paddingBottom: 16,
    marginBottom: 16,
  },
  productName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  productBarcode: {
    fontSize: 14,
    color: "#8E8E93",
    fontFamily: "monospace",
    marginBottom: 4,
  },
  productStock: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  form: {
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  cancelButtonText: {
    color: "#8E8E93",
    fontSize: 16,
  },
  // Create Product Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalDescription: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 20,
    lineHeight: 20,
  },
  modalForm: {
    flex: 1,
  },
  disabledInput: {
    backgroundColor: "#F5F5F5",
    color: "#8E8E93",
  },
  // OCR Processing styles
  processingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  processingContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    minWidth: 200,
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  processingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#8E8E93",
  },
  // Inventory check styles
  scanButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scanButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 8,
  },
  scanButtonSubtext: {
    color: "#fff",
    fontSize: 14,
    opacity: 0.9,
    marginTop: 4,
  },
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  productImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#f5f5f5",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F7",
  },
  infoLabel: {
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: "#000",
    fontWeight: "600",
    fontFamily: "monospace",
  },
  stockContainer: {
    marginTop: 8,
    padding: 16,
    backgroundColor: "#F2F2F7",
    borderRadius: 8,
  },
  stockLabel: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 8,
    fontWeight: "500",
  },
  stockValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stockValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
  },
  stockStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stockStatusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  descriptionContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  descriptionLabel: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 8,
    fontWeight: "500",
  },
  descriptionText: {
    fontSize: 14,
    color: "#000",
    lineHeight: 20,
  },
  historySection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  clearHistoryText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F7",
  },
  historyItemContent: {
    flex: 1,
  },
  historyItemName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
    marginBottom: 4,
  },
  historyItemStock: {
    flexDirection: "row",
    alignItems: "center",
  },
  historyItemStockText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#8E8E93",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#C7C7CC",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  // Batch Stock In List styles
  batchListContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  batchListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  batchListTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  clearBatchButton: {
    padding: 4,
  },
  batchListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F7",
  },
  batchListItemContent: {
    flex: 1,
    marginRight: 12,
  },
  batchListItemName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    marginBottom: 4,
  },
  batchListItemBarcode: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 8,
  },
  batchListItemSN: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    color: "#000",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  removeItemButton: {
    padding: 8,
  },
  batchStockInButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  batchStockInButtonDisabled: {
    backgroundColor: "#C7C7CC",
  },
  batchStockInButtonText: {
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

export default WarehouseScreen;
