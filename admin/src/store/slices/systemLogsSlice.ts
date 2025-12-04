import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Store } from '../../shared/types/store';

type LogLevel = 'info' | 'warning' | 'error';
type FilterOption = 'all' | LogLevel;

interface SystemLogsState {
  // UI State only - data is managed by RTK Query
  accessibleStores: Store[];
  
  // Filters
  searchTerm: string;
  filterLevel: FilterOption;
  selectedStoreId: string;
}

const initialState: SystemLogsState = {
  accessibleStores: [],
  searchTerm: '',
  filterLevel: 'all',
  selectedStoreId: 'all',
};

const systemLogsSlice = createSlice({
  name: 'systemLogs',
  initialState,
  reducers: {
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
    setFilterLevel: (state, action: PayloadAction<FilterOption>) => {
      state.filterLevel = action.payload;
    },
    setSelectedStoreId: (state, action: PayloadAction<string>) => {
      state.selectedStoreId = action.payload;
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
  setSearchTerm,
  setFilterLevel,
  setSelectedStoreId,
  setAccessibleStores,
} = systemLogsSlice.actions;

export default systemLogsSlice.reducer;
