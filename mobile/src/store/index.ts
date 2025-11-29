import { configureStore } from '@reduxjs/toolkit';
import warehouseReducer from './slices/warehouseSlice';
import { warehouseApi } from './api/warehouseApi';

export const store = configureStore({
  reducer: {
    warehouse: warehouseReducer,
    [warehouseApi.reducerPath]: warehouseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['warehouse/addPendingItem'],
        ignoredPaths: ['warehouse.pendingItems.scannedAt'],
      },
    }).concat(warehouseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

