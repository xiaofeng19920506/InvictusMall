import { configureStore } from '@reduxjs/toolkit';
import { inventoryApi } from './api/inventoryApi';
import inventorySlice from './slices/inventorySlice';

export const store = configureStore({
  reducer: {
    inventory: inventorySlice,
    [inventoryApi.reducerPath]: inventoryApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(inventoryApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

