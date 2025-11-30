import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Staff } from '../../services/api';
import type { Store } from '../../shared/types/store';

interface UsersState {
  // UI State only - data is managed by RTK Query
  stores: Store[];
  accessibleStores: Store[];
  
  // Filters
  searchTerm: string;
  filterRole: string;
  selectedStoreId: string;
  
  // Pagination
  currentPage: number;
  itemsPerPage: number;
  
  // Registration Form
  showRegisterForm: boolean;
  registerFormData: {
    email: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'owner' | 'manager' | 'employee';
    department: string;
    employeeId: string;
    storeId: string;
  };
  registerError: string;
  registerSuccess: string;
  isSubmitting: boolean;
  
  // For registration form submission
  submitting: boolean;
  
  // Editing
  editingUser: Staff | null;
}

const initialState: UsersState = {
  stores: [],
  accessibleStores: [],
  searchTerm: '',
  filterRole: 'all',
  selectedStoreId: 'all',
  currentPage: 1,
  itemsPerPage: 20,
  showRegisterForm: false,
  registerFormData: {
    email: '',
    firstName: '',
    lastName: '',
    role: 'employee',
    department: '',
    employeeId: '',
    storeId: '',
  },
  registerError: '',
  registerSuccess: '',
  isSubmitting: false,
  submitting: false,
  editingUser: null,
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
    setFilterRole: (state, action: PayloadAction<string>) => {
      state.filterRole = action.payload;
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
    setShowRegisterForm: (state, action: PayloadAction<boolean>) => {
      state.showRegisterForm = action.payload;
    },
    setRegisterFormData: (state, action: PayloadAction<Partial<UsersState['registerFormData']>>) => {
      state.registerFormData = { ...state.registerFormData, ...action.payload };
    },
    resetRegisterForm: (state) => {
      state.registerFormData = initialState.registerFormData;
      state.registerError = '';
      state.registerSuccess = '';
    },
    setRegisterError: (state, action: PayloadAction<string>) => {
      state.registerError = action.payload;
    },
    setRegisterSuccess: (state, action: PayloadAction<string>) => {
      state.registerSuccess = action.payload;
    },
    setEditingUser: (state, action: PayloadAction<Staff | null>) => {
      state.editingUser = action.payload;
    },
    setStores: (state, action: PayloadAction<Store[]>) => {
      state.stores = action.payload;
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
    setSubmitting: (state, action: PayloadAction<boolean>) => {
      state.submitting = action.payload;
      state.isSubmitting = action.payload;
    },
  },
});

export const {
  setSearchTerm,
  setFilterRole,
  setSelectedStoreId,
  setCurrentPage,
  setItemsPerPage,
  setShowRegisterForm,
  setRegisterFormData,
  resetRegisterForm,
  setRegisterError,
  setRegisterSuccess,
  setEditingUser,
  setStores,
  setAccessibleStores,
  setSubmitting,
} = usersSlice.actions;

export default usersSlice.reducer;
