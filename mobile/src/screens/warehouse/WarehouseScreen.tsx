import React, { useEffect, useState } from "react";
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
  FlatList,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  updatePendingItemQuantity,
  updatePendingItemSerialNumbers,
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
  const { user, stores, selectedStore, selectStore } = useAuth();

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
    console.log("[WarehouseScreen] 🔵 handleCreateProduct called");
    console.log("[WarehouseScreen] 📋 Form data:", {
      createProductName: createProductName,
      createProductPrice: createProductPrice,
      createProductBarcode: createProductBarcode,
      createProductSerialNumber: createProductSerialNumber,
      selectedStore: selectedStore?.id,
      isCreatingProduct,
    });

    // Validation checks
    if (!createProductName.trim() || !createProductPrice.trim()) {
      console.log("[WarehouseScreen] ❌ Validation failed: Missing required fields");
      showError("Please fill in all required fields");
      return;
    }

    const price = parseFloat(createProductPrice);
    if (isNaN(price) || price <= 0) {
      console.log("[WarehouseScreen] ❌ Validation failed: Invalid price", price);
      showError("Please enter a valid price");
      return;
    }

    if (!selectedStore) {
      console.log("[WarehouseScreen] ❌ Validation failed: No store selected");
      showError(
        "No store selected. Please select a store first."
      );
      return;
    }

    console.log("[WarehouseScreen] ✅ Validation passed, creating product...");

    try {
      const productData = {
        storeId: selectedStore.id,
        name: createProductName.trim(),
        description: "",
        price: price,
        barcode: createProductBarcode || undefined,
        stockQuantity: 0,
        category: "",
        isActive: true,
        serialNumber: createProductSerialNumber.trim() || undefined,
      };

      console.log("[WarehouseScreen] 📤 Calling createProduct mutation with data:", productData);

      const newProduct = await createProduct(productData).unwrap();

      console.log("[WarehouseScreen] ✅ Product created successfully:", newProduct);

      showSuccess("Product created successfully!");

      // Handle based on operation type
      if (operationType === "in") {
        // For stock in: automatically add to batch list (1 unit)
        console.log("[WarehouseScreen] 📦 Adding new product to batch stock in list");
        
        // Check if product already exists in list (shouldn't, but just in case)
        const existingItem = pendingStockInItems.find(
          (item) => item.product.id === newProduct.id
        );
        const isNewProduct = !existingItem;
        const currentQuantity = existingItem ? existingItem.quantity : 0;

        // Add or update pending item (will auto-increment if same product)
        dispatch(
          addPendingItem({
            product: newProduct,
            serialNumber: createProductSerialNumber.trim() || undefined,
          })
        );

        const newQuantity = currentQuantity + 1;
        showSuccess(
          `${newProduct.name} added to stock in list (${newQuantity} unit${newQuantity > 1 ? "s" : ""})`
        );

        // Re-open photo capture for next scan
        dispatch(resetCreateProductModal());
        dispatch(setShowPhotoCapture(true));
      } else if (operationType === "out") {
        // For stock out: set as selected product (user needs to enter quantity)
        console.log("[WarehouseScreen] 📦 Setting as selected product for stock out operation");
        dispatch(setSelectedProduct(newProduct));
        if (createProductSerialNumber.trim()) {
          dispatch(setSerialNumber(createProductSerialNumber.trim()));
        }
        dispatch(resetCreateProductModal());
      } else {
        // No operation mode - inventory check or other
        console.log("[WarehouseScreen] 🔍 Setting as checked product for inventory check");
        dispatch(setCheckedProduct(newProduct));
        dispatch(addToScanHistory(newProduct));
        dispatch(resetCreateProductModal());
      }
    } catch (error: any) {
      console.error("[WarehouseScreen] ❌ Error creating product:", error);
      console.error("[WarehouseScreen] ❌ Error details:", {
        message: error?.message,
        data: error?.data,
        status: error?.status,
        stack: error?.stack,
      });
      showError(error?.data?.message || error?.message || "Failed to create product");
    }
  };

  // Handle photo capture for stock in
  const handlePhotoTaken = async (imageUri: string) => {
    dispatch(setShowPhotoCapture(false));

    try {
      console.log("[WarehouseScreen] 📷 Photo taken, starting OCR...");
      console.log("[WarehouseScreen] 🔍 Current operationType:", operationType);
      console.log("[WarehouseScreen] 🔍 Current pendingStockInItems count:", pendingStockInItems.length);

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
            product.name,
            "ID:",
            product.id
          );
        } catch (error: any) {
          if (error.status !== 404) {
            console.error("[WarehouseScreen] Error fetching product:", error);
          }
          console.log("[WarehouseScreen] ⚠️ Product not found by barcode");
        }
      }

      // For stock in: add to batch list (1 unit per scan, auto-increment if same product)
      // For stock out: use old single product flow
      if (product) {
        if (operationType === "in") {
          console.log("[WarehouseScreen] 📦 Processing stock in for product:", product.name);
          // Check if product already exists in list BEFORE dispatching
          const existingItem = pendingStockInItems.find(
            (item) => item.product.id === product.id
          );
          const isNewProduct = !existingItem;
          const currentQuantity = existingItem ? existingItem.quantity : 0;

          console.log("[WarehouseScreen] 📊 Before dispatch - Existing item:", existingItem ? { quantity: existingItem.quantity } : null);

          // Add or update pending item (will auto-increment if same product)
          dispatch(
            addPendingItem({
              product: product,
              serialNumber: parsed.serialNumber || undefined,
            })
          );

          // Show success message with updated quantity
          const newQuantity = currentQuantity + 1;
          showSuccess(
            `${product.name} ${isNewProduct ? "added" : "quantity updated"} (${newQuantity} unit${newQuantity > 1 ? "s" : ""})`
          );

          console.log("[WarehouseScreen] ✅ Item dispatched. Expected new quantity:", newQuantity);
          console.log("[WarehouseScreen] 📊 After dispatch - Will check Redux state in next render");

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

      // For stock in operations, automatically add to batch list
      if (operationType === "in") {
        // Check if product already exists in list
        const existingItem = pendingStockInItems.find(
          (item) => item.product.id === product.id
        );
        const isNewProduct = !existingItem;
        const currentQuantity = existingItem ? existingItem.quantity : 0;
        const newQuantity = currentQuantity + 1;

        // Add or update pending item (will auto-increment if same product)
        dispatch(
          addPendingItem({
            product: product,
            serialNumber: undefined, // Barcode scan doesn't provide serial number
          })
        );

        // Show success message with quantity info
        showSuccess(
          `${product.name} ${isNewProduct ? "added" : "quantity updated"} (${newQuantity} unit${newQuantity > 1 ? "s" : ""})`
        );

        // Re-open scanner for next scan
        setTimeout(() => {
          dispatch(setShowScanner(true));
        }, 500);
      } else {
        // For stock out, use old single product flow
        dispatch(setSelectedProduct(product));
      }
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
      // Merge operations by product to avoid race conditions and improve efficiency
      const productOperationsMap = new Map<string, {
        productId: string;
        quantity: number;
        reasons: string[];
      }>();

      pendingStockInItems.forEach((item) => {
        const existing = productOperationsMap.get(item.product.id);
        
        if (item.serialNumbers && item.serialNumbers.length > 0) {
          // If there are serial numbers, include them in reasons
          const serialReasons = item.serialNumbers.map(sn => `S/N: ${sn}`);
          if (existing) {
            existing.quantity += item.quantity;
            existing.reasons.push(...serialReasons);
          } else {
            productOperationsMap.set(item.product.id, {
              productId: item.product.id,
              quantity: item.quantity,
              reasons: serialReasons,
            });
          }
        } else {
          // No serial numbers, just add quantity
          if (existing) {
            existing.quantity += item.quantity;
          } else {
            productOperationsMap.set(item.product.id, {
              productId: item.product.id,
              quantity: item.quantity,
              reasons: [],
            });
          }
        }
      });

      // Convert map to array and combine reasons if any
      const batchItems = Array.from(productOperationsMap.values()).map(op => ({
        productId: op.productId,
        quantity: op.quantity,
        reason: op.reasons.length > 0 ? op.reasons.join(' | ') : undefined,
      }));

      console.log("[WarehouseScreen] 📦 Starting batch stock in with items:", batchItems);
      console.log("[WarehouseScreen] 📊 Batch items details:", batchItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        reason: item.reason,
      })));

      const result = await batchStockIn(batchItems).unwrap();
      
      console.log("[WarehouseScreen] ✅ Batch stock in completed successfully:", result);
      
      // Calculate total units stocked
      const totalUnits = pendingStockInItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      
      showSuccess(
        `Successfully stocked in ${totalUnits} unit${totalUnits > 1 ? "s" : ""} across ${pendingStockInItems.length} product${pendingStockInItems.length > 1 ? "s" : ""}`
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

  const [showStorePicker, setShowStorePicker] = useState(false);

  return (
    <View style={styles.container}>
      {/* Store Selector - Show if multiple stores or when loading */}
      {(stores.length > 1 || (stores.length === 0 && user)) && (
        <View style={styles.storeSelectorContainer}>
          <TouchableOpacity
            style={styles.storeSelector}
            onPress={() => stores.length > 1 && setShowStorePicker(true)}
            disabled={stores.length <= 1}
          >
            <MaterialIcons name="store" size={20} color="#007AFF" />
            <Text style={styles.storeSelectorText}>
              {selectedStore?.name || (stores.length === 0 ? "Loading stores..." : "Select Store")}
            </Text>
            {stores.length > 1 && (
              <MaterialIcons name="arrow-drop-down" size={20} color="#8E8E93" />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Show error if no store available */}
      {stores.length === 0 && !user?.storeId && user && (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={24} color="#FF3B30" />
          <Text style={styles.errorText}>
            No stores available. Please contact your administrator.
          </Text>
        </View>
      )}

      {/* Store Picker Modal */}
      <Modal
        visible={showStorePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStorePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.storePickerModal}>
            <View style={styles.storePickerHeader}>
              <Text style={styles.storePickerTitle}>Select Store</Text>
              <TouchableOpacity
                onPress={() => setShowStorePicker(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={stores}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.storeOption,
                    selectedStore?.id === item.id && styles.selectedStoreOption,
                  ]}
                  onPress={() => {
                    selectStore(item);
                    setShowStorePicker(false);
                  }}
                >
                  <MaterialIcons
                    name="store"
                    size={20}
                    color={selectedStore?.id === item.id ? "#007AFF" : "#8E8E93"}
                  />
                  <Text
                    style={[
                      styles.storeOptionText,
                      selectedStore?.id === item.id &&
                        styles.selectedStoreOptionText,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {selectedStore?.id === item.id && (
                    <MaterialIcons name="check" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

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
                onUpdateQuantity={(itemId, quantity) => {
                  dispatch(updatePendingItemQuantity({ id: itemId, quantity }));
                }}
                onUpdateSerialNumbers={(itemId, serialNumbers) => {
                  dispatch(updatePendingItemSerialNumbers({ id: itemId, serialNumbers }));
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

            {/* Only show StockOperationForm for stock out operations */}
            {selectedProduct && operationType === "out" && (
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
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Product</Text>
            <TouchableOpacity
              onPress={() => {
                console.log("[WarehouseScreen] ❌ Close button pressed");
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
              {createProductBarcode
                ? `Product with barcode "${createProductBarcode}" was not found. `
                : ""}
              Please fill in the details to create a new product.
            </Text>

            <View style={styles.modalForm}>
              <Text style={styles.label}>Barcode</Text>
              <TextInput
                style={styles.input}
                value={createProductBarcode}
                onChangeText={(text) => dispatch(setCreateProductBarcode(text))}
                placeholder="Enter barcode (optional)"
                autoCapitalize="characters"
                editable={!isCreatingProduct}
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
                onPress={() => {
                  console.log("[WarehouseScreen] 👆 Create Product button pressed");
                  console.log("[WarehouseScreen] 🔍 Button state:", {
                    isCreatingProduct,
                    hasName: !!createProductName.trim(),
                    hasPrice: !!createProductPrice.trim(),
                    disabled: isCreatingProduct || !createProductName.trim() || !createProductPrice.trim(),
                  });
                  handleCreateProduct();
                }}
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
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  // Store Selector styles
  storeSelectorContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  storeSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  storeSelectorText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  // Store Picker Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  storePickerModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 20,
  },
  storePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  storePickerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
  },
  closeButton: {
    padding: 4,
  },
  storeOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F7",
    gap: 12,
  },
  selectedStoreOption: {
    backgroundColor: "#E3F2FD",
  },
  storeOptionText: {
    flex: 1,
    fontSize: 16,
    color: "#000",
  },
  selectedStoreOptionText: {
    fontWeight: "600",
    color: "#007AFF",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFE5E5",
    padding: 16,
    margin: 16,
    borderRadius: 8,
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: "#FF3B30",
    fontWeight: "500",
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
    ...Platform.select({
      ios: {
        paddingTop: 8,
      },
      android: {
        paddingTop: 12,
      },
    }),
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
