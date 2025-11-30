import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Order } from '../../services/api';
import type { Store } from '../../shared/types/store';

interface OrdersState {
  // UI State only - data is managed by RTK Query
  accessibleStores: Store[];

  // Filters
  searchQuery: string;
  statusFilter: string;
  selectedStoreId: string;

  // Pagination
  currentPage: number;
  itemsPerPage: number;

  // Modals
  selectedOrder: Order | null;
  isStatusModalOpen: boolean;
  isDetailModalOpen: boolean;
}

const initialState: OrdersState = {
  accessibleStores: [],
  searchQuery: '',
  statusFilter: '',
  selectedStoreId: 'all',
  currentPage: 1,
  itemsPerPage: 20,
  selectedOrder: null,
  isStatusModalOpen: false,
  isDetailModalOpen: false,
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setStatusFilter: (state, action: PayloadAction<string>) => {
      state.statusFilter = action.payload;
    },
    setSelectedStoreId: (state, action: PayloadAction<string>) => {
      state.selectedStoreId = action.payload;
    },
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    setItemsPerPage: (state, action: PayloadAction<number>) => {
      state.itemsPerPage = action.payload;
      state.currentPage = 1;
    },
    setSelectedOrder: (state, action: PayloadAction<Order | null>) => {
      state.selectedOrder = action.payload;
    },
    setIsStatusModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isStatusModalOpen = action.payload;
    },
    setIsDetailModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isDetailModalOpen = action.payload;
    },
    setAccessibleStores: (state, action: PayloadAction<Store[]>) => {
      state.accessibleStores = action.payload;
      // Auto-select if only one store
      if (action.payload.length === 1) {
        state.selectedStoreId = action.payload[0].id;
      } else {
        state.selectedStoreId = 'all';
      }
    },
  },
});

export const {
  setSearchQuery,
  setStatusFilter,
  setSelectedStoreId,
  setCurrentPage,
  setItemsPerPage,
  setSelectedOrder,
  setIsStatusModalOpen,
  setIsDetailModalOpen,
  setAccessibleStores,
} = ordersSlice.actions;

export default ordersSlice.reducer;
