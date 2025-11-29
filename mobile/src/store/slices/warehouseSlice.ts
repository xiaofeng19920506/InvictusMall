import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Product } from '../../types';
import type { TabType, PendingStockInItem } from '../../screens/warehouse/types';

interface WarehouseState {
  // UI states
  activeTab: TabType;
  showScanner: boolean;
  showPhotoCapture: boolean;
  showInventoryScanner: boolean;
  showCreateProductModal: boolean;
  isProcessingOCR: boolean;
  
  // Operation states
  operationType: 'in' | 'out' | null;
  selectedProduct: Product | null;
  quantity: string;
  reason: string;
  serialNumber: string;
  isProcessing: boolean;
  
  // Batch stock in states
  pendingStockInItems: PendingStockInItem[];
  
  // Inventory check states
  checkedProduct: Product | null;
  scanHistory: Product[];
  
  // Create product modal states
  createProductBarcode: string;
  createProductName: string;
  createProductPrice: string;
  createProductSerialNumber: string;
  isCreatingProduct: boolean;
}

const initialState: WarehouseState = {
  activeTab: 'operations',
  showScanner: false,
  showPhotoCapture: false,
  showInventoryScanner: false,
  showCreateProductModal: false,
  isProcessingOCR: false,
  operationType: null,
  selectedProduct: null,
  quantity: '',
  reason: '',
  serialNumber: '',
  isProcessing: false,
  pendingStockInItems: [],
  checkedProduct: null,
  scanHistory: [],
  createProductBarcode: '',
  createProductName: '',
  createProductPrice: '',
  createProductSerialNumber: '',
  isCreatingProduct: false,
};

const warehouseSlice = createSlice({
  name: 'warehouse',
  initialState,
  reducers: {
    // UI state actions
    setActiveTab: (state, action: PayloadAction<TabType>) => {
      state.activeTab = action.payload;
    },
    setShowScanner: (state, action: PayloadAction<boolean>) => {
      state.showScanner = action.payload;
    },
    setShowPhotoCapture: (state, action: PayloadAction<boolean>) => {
      state.showPhotoCapture = action.payload;
    },
    setShowInventoryScanner: (state, action: PayloadAction<boolean>) => {
      state.showInventoryScanner = action.payload;
    },
    setShowCreateProductModal: (state, action: PayloadAction<boolean>) => {
      state.showCreateProductModal = action.payload;
    },
    setIsProcessingOCR: (state, action: PayloadAction<boolean>) => {
      state.isProcessingOCR = action.payload;
    },
    
    // Operation state actions
    setOperationType: (state, action: PayloadAction<'in' | 'out' | null>) => {
      state.operationType = action.payload;
    },
    setSelectedProduct: (state, action: PayloadAction<Product | null>) => {
      state.selectedProduct = action.payload;
    },
    setQuantity: (state, action: PayloadAction<string>) => {
      state.quantity = action.payload;
    },
    setReason: (state, action: PayloadAction<string>) => {
      state.reason = action.payload;
    },
    setSerialNumber: (state, action: PayloadAction<string>) => {
      state.serialNumber = action.payload;
    },
    setIsProcessing: (state, action: PayloadAction<boolean>) => {
      state.isProcessing = action.payload;
    },
    resetOperation: (state) => {
      state.selectedProduct = null;
      state.quantity = '';
      state.reason = '';
      state.serialNumber = '';
      state.operationType = null;
    },
    
    // Batch stock in actions
    // Add or update pending item - if product exists, increment quantity; otherwise add new item
    addPendingItem: (
      state,
      action: PayloadAction<{ product: Product; serialNumber?: string }>
    ) => {
      const existingItem = state.pendingStockInItems.find(
        (item) => item.product.id === action.payload.product.id
      );

      if (existingItem) {
        // Product already exists, increment quantity
        // Create a new object reference to ensure React re-renders
        existingItem.quantity += 1;
        existingItem.lastScannedAt = new Date().toISOString();
        // Add serial number to array if provided
        if (action.payload.serialNumber) {
          if (!existingItem.serialNumbers) {
            existingItem.serialNumbers = [];
          }
          // Create new array reference
          existingItem.serialNumbers = [...existingItem.serialNumbers, action.payload.serialNumber];
        }
      } else {
        // New product, add new item
        const now = new Date().toISOString();
        const newItem: PendingStockInItem = {
          id: action.payload.product.id, // Use product ID as unique identifier
          product: action.payload.product,
          quantity: 1,
          serialNumbers: action.payload.serialNumber ? [action.payload.serialNumber] : undefined,
          firstScannedAt: now,
          lastScannedAt: now,
        };
        state.pendingStockInItems.push(newItem);
      }
    },
    removePendingItem: (state, action: PayloadAction<string>) => {
      state.pendingStockInItems = state.pendingStockInItems.filter(
        (item) => item.id !== action.payload
      );
    },
    updatePendingItemQuantity: (
      state,
      action: PayloadAction<{ id: string; quantity: number }>
    ) => {
      const item = state.pendingStockInItems.find(
        (item) => item.id === action.payload.id
      );
      if (item && action.payload.quantity > 0) {
        item.quantity = action.payload.quantity;
      }
    },
    updatePendingItemSerialNumbers: (
      state,
      action: PayloadAction<{ id: string; serialNumbers: string[] }>
    ) => {
      const item = state.pendingStockInItems.find(
        (item) => item.id === action.payload.id
      );
      if (item) {
        item.serialNumbers = action.payload.serialNumbers;
      }
    },
    clearPendingItems: (state) => {
      state.pendingStockInItems = [];
    },
    
    // Inventory check actions
    setCheckedProduct: (state, action: PayloadAction<Product | null>) => {
      state.checkedProduct = action.payload;
    },
    addToScanHistory: (state, action: PayloadAction<Product>) => {
      const exists = state.scanHistory.some((p) => p.id === action.payload.id);
      if (!exists) {
        state.scanHistory = [action.payload, ...state.scanHistory].slice(0, 10);
      }
    },
    clearScanHistory: (state) => {
      state.scanHistory = [];
    },
    
    // Create product modal actions
    setCreateProductBarcode: (state, action: PayloadAction<string>) => {
      state.createProductBarcode = action.payload;
    },
    setCreateProductName: (state, action: PayloadAction<string>) => {
      state.createProductName = action.payload;
    },
    setCreateProductPrice: (state, action: PayloadAction<string>) => {
      state.createProductPrice = action.payload;
    },
    setCreateProductSerialNumber: (state, action: PayloadAction<string>) => {
      state.createProductSerialNumber = action.payload;
    },
    setIsCreatingProduct: (state, action: PayloadAction<boolean>) => {
      state.isCreatingProduct = action.payload;
    },
    resetCreateProductModal: (state) => {
      state.createProductBarcode = '';
      state.createProductName = '';
      state.createProductPrice = '';
      state.createProductSerialNumber = '';
      state.showCreateProductModal = false;
    },
  },
});

export const {
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
} = warehouseSlice.actions;

export default warehouseSlice.reducer;

