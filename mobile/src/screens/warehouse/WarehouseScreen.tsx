import React, { useEffect } from "react";
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
import { useNotification } from "../../contexts/NotificationContext";
import { useAuth } from "../../contexts/AuthContext";
import type { BarcodeScanResult, Product } from "../../types";
import type { TabType, PendingStockInItem } from "./types";
import { getStockStatus } from "./utils";
import BatchStockInList from "./components/BatchStockInList";
import StockOperationForm from "./components/StockOperationForm";
import InventoryCheckTab from "./components/InventoryCheckTab";
import CreateProductModal from "./components/CreateProductModal";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import {
  setActiveTab,
  setShowScanner,
  setShowPhotoCapture,
  setShowInventoryScanner,
  setShowCreateProductModal,
  setIsProcessingOCR,
  setOperationType,
  setSelectedProduct,
  setQuantity,
  setReason,
  setSerialNumber,
  setIsProcessing,
  resetOperation,
  addPendingItem,
  removePendingItem,
  updatePendingItemSerialNumber,
  clearPendingItems,
  setCheckedProduct,
  addToScanHistory,
  clearScanHistory,
  setCreateProductBarcode,
  setCreateProductName,
  setCreateProductPrice,
  setCreateProductSerialNumber,
  setIsCreatingProduct,
  resetCreateProductModal,
} from "../../store/slices/warehouseSlice";
import {
  useLazyGetProductByBarcodeQuery,
  useCreateProductMutation,
  useExtractTextFromImageMutation,
  useCreateStockOperationMutation,
  useBatchStockInMutation,
} from "../../store/api/warehouseApi";

const WarehouseScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();

  // Redux state
  const activeTab = useAppSelector((state) => state.warehouse.activeTab);
  const showScanner = useAppSelector((state) => state.warehouse.showScanner);
  const showPhotoCapture = useAppSelector((state) => state.warehouse.showPhotoCapture);
  const operationType = useAppSelector((state) => state.warehouse.operationType);
  const selectedProduct = useAppSelector((state) => state.warehouse.selectedProduct);
  const quantity = useAppSelector((state) => state.warehouse.quantity);
  const reason = useAppSelector((state) => state.warehouse.reason);
  const serialNumber = useAppSelector((state) => state.warehouse.serialNumber);
  const isProcessing = useAppSelector((state) => state.warehouse.isProcessing);
  const isProcessingOCR = useAppSelector((state) => state.warehouse.isProcessingOCR);
  const pendingStockInItems = useAppSelector((state) => state.warehouse.pendingStockInItems);
  const showInventoryScanner = useAppSelector((state) => state.warehouse.showInventoryScanner);
  const checkedProduct = useAppSelector((state) => state.warehouse.checkedProduct);
  const scanHistory = useAppSelector((state) => state.warehouse.scanHistory);
  const showCreateProductModal = useAppSelector((state) => state.warehouse.showCreateProductModal);
  const createProductBarcode = useAppSelector((state) => state.warehouse.createProductBarcode);
  const createProductName = useAppSelector((state) => state.warehouse.createProductName);
  const createProductPrice = useAppSelector((state) => state.warehouse.createProductPrice);
  const createProductSerialNumber = useAppSelector((state) => state.warehouse.createProductSerialNumber);
  const isCreatingProduct = useAppSelector((state) => state.warehouse.isCreatingProduct);

  // RTK Query hooks
  const [getProductByBarcode, { isLoading: isLoadingProduct }] = useLazyGetProductByBarcodeQuery();
  const [createProduct, { isLoading: isCreatingProductMutation }] = useCreateProductMutation();
  const [extractTextFromImage, { isLoading: isExtractingText }] = useExtractTextFromImageMutation();
  const [createStockOperation, { isLoading: isCreatingStockOperation }] = useCreateStockOperationMutation();
  const [batchStockIn, { isLoading: isBatchStockInLoading }] = useBatchStockInMutation();

  // Update isProcessing state based on mutation loading states
  useEffect(() => {
    dispatch(setIsProcessing(isCreatingStockOperation || isBatchStockInLoading));
  }, [isCreatingStockOperation, isBatchStockInLoading, dispatch]);

  // Update isCreatingProduct state when mutation loading changes
  useEffect(() => {
    dispatch(setIsCreatingProduct(isCreatingProductMutation));
  }, [isCreatingProductMutation, dispatch]);

  // Update isProcessingOCR state when extraction loading changes
  useEffect(() => {
    dispatch(setIsProcessingOCR(isExtractingText));
  }, [isExtractingText, dispatch]);

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

    if (!user || !user.storeId) {
      showError(
        "Unable to get store information. Please try logging in again."
      );
      return;
    }

    try {
      const productData = {
        storeId: user.storeId,
        name: createProductName.trim(),
        description: "",
        price: price,
        barcode: createProductBarcode || undefined,
        stockQuantity: 0,
        category: "",
        isActive: true,
        serialNumber: createProductSerialNumber.trim() || undefined,
      };

      const newProduct = await createProduct(productData).unwrap();

      showSuccess("Product created successfully!");

      // If we were in operation mode, set as selected product
      if (operationType) {
        dispatch(setSelectedProduct(newProduct));
        // Serial number should already be set from OCR parsing
      } else {
        // If we were in inventory check mode, set as checked product
        dispatch(setCheckedProduct(newProduct));
        // Add to scan history
        dispatch(addToScanHistory(newProduct));
      }

      dispatch(resetCreateProductModal());
      // Keep serial number if it was set from OCR
    } catch (error: any) {
      console.error("Error creating product:", error);
      showError(error.message || "Failed to create product");
    }
  };

  // Handle photo capture for stock in
  const handlePhotoTaken = async (imageUri: string) => {
    dispatch(setShowPhotoCapture(false));

    try {
      console.log("[WarehouseScreen] 📷 Photo taken, starting OCR...");

      // Extract text from image using OCR
      const ocrData = await extractTextFromImage({ imageUri }).unwrap();
      const { text, parsed } = ocrData;

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
          const productResult = await getProductByBarcode(parsed.barcode).unwrap();
          product = productResult;
          console.log(
            "[WarehouseScreen] ✅ Product found by barcode:",
            product.name
          );
        } catch (error: any) {
          if (error.status !== 404) {
            console.error("[WarehouseScreen] Error fetching product:", error);
          }
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

          dispatch(addPendingItem(newItem));
          showSuccess(
            `${product.name} added (${pendingStockInItems.length + 1} item${
              pendingStockInItems.length > 0 ? "s" : ""
            } in list)`
          );

          // Re-open photo capture for next scan
          dispatch(setShowPhotoCapture(true));
        } else {
          // Stock out: use old single product flow
          dispatch(setSelectedProduct(product));
          if (parsed.serialNumber) {
            dispatch(setSerialNumber(parsed.serialNumber));
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

        dispatch(setCreateProductBarcode(parsed.barcode || ""));
        dispatch(setCreateProductName(productName ? productName.trim() : ""));
        dispatch(setCreateProductPrice("")); // Don't pre-fill price, let user decide
        // Set serial number if available
        if (parsed.serialNumber) {
          dispatch(setCreateProductSerialNumber(parsed.serialNumber));
        } else {
          dispatch(setCreateProductSerialNumber(""));
        }
        dispatch(setShowCreateProductModal(true));
      }
    } catch (error: any) {
      console.error("[WarehouseScreen] ❌ OCR processing error:", error);
      showError(error.message || "Failed to process image");
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

    dispatch(setShowScanner(false));

    if (result.type === "product" && result.data) {
      const product = result.data as Product;
      console.log(
        "[WarehouseScreen] ✅ Product found for operation:",
        product.name
      );
      dispatch(setSelectedProduct(product));
    } else if (result.type === "product_not_found") {
      console.log(
        "[WarehouseScreen] 📝 Product not found, opening create modal:",
        result.value
      );
      // Open create product modal with pre-filled barcode
      dispatch(setCreateProductBarcode(result.value));
      dispatch(setCreateProductName(""));
      dispatch(setCreateProductPrice(""));
      dispatch(setCreateProductSerialNumber(""));
      dispatch(setShowCreateProductModal(true));
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

    dispatch(setShowInventoryScanner(false));

    if (result.type === "product" && result.data) {
      const product = result.data as Product;
      console.log(
        "[WarehouseScreen] ✅ Product found for inventory check:",
        product.name
      );
      dispatch(setCheckedProduct(product));
      dispatch(addToScanHistory(product));
    } else if (result.type === "product_not_found") {
      console.log(
        "[WarehouseScreen] 📝 Product not found in inventory check, opening create modal:",
        result.value
      );
      // Open create product modal with pre-filled barcode
      dispatch(setCreateProductBarcode(result.value));
      dispatch(setCreateProductName(""));
      dispatch(setCreateProductPrice(""));
      dispatch(setCreateProductSerialNumber(""));
      dispatch(setShowCreateProductModal(true));
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

    try {
      // Prepare batch items for RTK Query mutation
      const batchItems = pendingStockInItems.map((item) => ({
        productId: item.product.id,
        quantity: 1, // Always 1 unit per scan
        reason: item.serialNumber ? `S/N: ${item.serialNumber}` : undefined,
      }));

      await batchStockIn(batchItems).unwrap();
      showSuccess(
        `Successfully stocked in ${pendingStockInItems.length} items`
      );
      dispatch(clearPendingItems());
      dispatch(setOperationType(null));
      dispatch(setShowPhotoCapture(false));
    } catch (error: any) {
      showError(error.message || "Batch stock in failed");
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

    try {
      // Include serial number in reason if provided (for stock in operations)
      let finalReason = reason || "";
      if (operationType === "in" && serialNumber.trim()) {
        finalReason = finalReason
          ? `${finalReason} | S/N: ${serialNumber.trim()}`
          : `S/N: ${serialNumber.trim()}`;
      }

      const result = await createStockOperation({
        productId: selectedProduct.id,
        type: operationType,
        quantity: qty,
        reason: finalReason || undefined,
      }).unwrap();

      let message = `Stock ${
        operationType === "in" ? "In" : "Out"
      } operation completed`;

      // If order was updated, show additional info
      if (result.orderUpdated && result.orderStatus) {
        message += `. Order status updated to ${result.orderStatus}`;
      }

      showSuccess(message);
      dispatch(resetOperation());
    } catch (error: any) {
      const errorMessage =
        error.data?.message || error.message || "Operation failed";
      showError(errorMessage);
    }
  };

  const clearCheckedProduct = () => {
    dispatch(setCheckedProduct(null));
  };

  const clearHistory = () => {
    dispatch(clearScanHistory());
  };

  const selectFromHistory = (product: Product) => {
    dispatch(setCheckedProduct(product));
  };

  return (
    <View style={styles.container}>
      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "operations" && styles.activeTab]}
          onPress={() => dispatch(setActiveTab("operations"))}
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
          onPress={() => dispatch(setActiveTab("inventory"))}
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
                  dispatch(setOperationType("in"));
                  dispatch(setShowPhotoCapture(true));
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
                  dispatch(setOperationType("out"));
                  dispatch(setShowScanner(true));
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
                  dispatch(updatePendingItemSerialNumber({ id: itemId, serialNumber }));
                }}
                onRemoveItem={(itemId) => {
                  dispatch(removePendingItem(itemId));
                }}
                onStockInAll={handleBatchStockIn}
                onContinueScan={() => dispatch(setShowPhotoCapture(true))}
                onClear={() => {
                  dispatch(clearPendingItems());
                  dispatch(setShowPhotoCapture(false));
                  dispatch(setOperationType(null));
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
                onQuantityChange={(value) => dispatch(setQuantity(value))}
                onReasonChange={(value) => dispatch(setReason(value))}
                onSerialNumberChange={(value) => dispatch(setSerialNumber(value))}
                onSubmit={handleOperation}
                onCancel={() => {
                  dispatch(resetOperation());
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
            onScan={() => dispatch(setShowInventoryScanner(true))}
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
        onRequestClose={() => dispatch(setShowScanner(false))}
      >
        <BarcodeScanner
          onScan={handleOperationScan}
          onClose={() => dispatch(setShowScanner(false))}
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
        onRequestClose={() => dispatch(setShowInventoryScanner(false))}
      >
        <BarcodeScanner
          onScan={handleInventoryScan}
          onClose={() => dispatch(setShowInventoryScanner(false))}
          title="Scan Product to Check Inventory"
          description="Point the camera at a product barcode"
        />
      </Modal>

      {/* Photo Capture Modal */}
      {showPhotoCapture && (
        <PhotoCapture
          onPhotoTaken={handlePhotoTaken}
          onClose={() => {
            dispatch(setShowPhotoCapture(false));
            dispatch(setOperationType(null));
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
            dispatch(resetCreateProductModal());
          }
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Product</Text>
            <TouchableOpacity
              onPress={() => {
                if (!isCreatingProduct) {
                  dispatch(resetCreateProductModal());
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
                onChangeText={(text) => dispatch(setCreateProductName(text))}
                placeholder="Enter product name"
                autoCapitalize="words"
                editable={!isCreatingProduct}
              />

              <Text style={styles.label}>Price *</Text>
              <TextInput
                style={styles.input}
                value={createProductPrice}
                onChangeText={(text) => dispatch(setCreateProductPrice(text))}
                placeholder="Enter price (e.g., 19.99)"
                keyboardType="decimal-pad"
                editable={!isCreatingProduct}
              />

              <Text style={styles.label}>Serial Number (S/N)</Text>
              <TextInput
                style={styles.input}
                value={createProductSerialNumber}
                onChangeText={(text) => dispatch(setCreateProductSerialNumber(text))}
                placeholder="Enter serial number (optional)"
                autoCapitalize="characters"
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
                    dispatch(resetCreateProductModal());
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
