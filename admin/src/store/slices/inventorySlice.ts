import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface InventoryState {
  // Store selection
  selectedStoreId: string;
  
  // Search and filters
  searchTerm: string;
  
  // Products tab pagination
  productsPage: number;
  productsItemsPerPage: number;
  
  // Editing state
  editingStock: Record<string, number>;
  savingStock: string | null;
  
  // Tab selection
  activeTab: 'products' | 'history';
  
  // History tab state
  operationsPage: number;
  operationsItemsPerPage: number;
  operationsTypeFilter: string;
  selectedProductForHistory: string | null;
}

const initialState: InventoryState = {
  selectedStoreId: '',
  searchTerm: '',
  productsPage: 1,
  productsItemsPerPage: 20,
  editingStock: {},
  savingStock: null,
  activeTab: 'products',
  operationsPage: 1,
  operationsItemsPerPage: 20,
  operationsTypeFilter: '',
  selectedProductForHistory: null,
};

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    setSelectedStoreId: (state, action: PayloadAction<string>) => {
      state.selectedStoreId = action.payload;
      // Reset products page when store changes
      state.productsPage = 1;
    },
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
    setProductsPage: (state, action: PayloadAction<number>) => {
      state.productsPage = action.payload;
    },
    setProductsItemsPerPage: (state, action: PayloadAction<number>) => {
      state.productsItemsPerPage = action.payload;
      state.productsPage = 1;
    },
    setEditingStock: (state, action: PayloadAction<{ productId: string; stock: number }>) => {
      state.editingStock[action.payload.productId] = action.payload.stock;
    },
    removeEditingStock: (state, action: PayloadAction<string>) => {
      delete state.editingStock[action.payload];
    },
    clearEditingStock: (state) => {
      state.editingStock = {};
    },
    setSavingStock: (state, action: PayloadAction<string | null>) => {
      state.savingStock = action.payload;
    },
    setActiveTab: (state, action: PayloadAction<'products' | 'history'>) => {
      state.activeTab = action.payload;
    },
    setOperationsPage: (state, action: PayloadAction<number>) => {
      state.operationsPage = action.payload;
    },
    setOperationsItemsPerPage: (state, action: PayloadAction<number>) => {
      state.operationsItemsPerPage = action.payload;
      state.operationsPage = 1;
    },
    setOperationsTypeFilter: (state, action: PayloadAction<string>) => {
      state.operationsTypeFilter = action.payload;
      state.operationsPage = 1;
    },
    setSelectedProductForHistory: (state, action: PayloadAction<string | null>) => {
      state.selectedProductForHistory = action.payload;
      state.operationsPage = 1;
    },
  },
});

export const {
  setSelectedStoreId,
  setSearchTerm,
  setProductsPage,
  setProductsItemsPerPage,
  setEditingStock,
  removeEditingStock,
  clearEditingStock,
  setSavingStock,
  setActiveTab,
  setOperationsPage,
  setOperationsItemsPerPage,
  setOperationsTypeFilter,
  setSelectedProductForHistory,
} = inventorySlice.actions;

export default inventorySlice.reducer;

