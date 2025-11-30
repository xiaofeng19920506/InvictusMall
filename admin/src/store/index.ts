import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from './api/baseApi';
import { inventoryApi } from './api/inventoryApi';
import { staffApi } from './api/staffApi';
import { ordersApi } from './api/ordersApi';
import { activityLogsApi } from './api/activityLogsApi';
import { storesApi } from './api/storesApi';
import inventorySlice from './slices/inventorySlice';
import authSlice from './slices/authSlice';
import usersSlice from './slices/usersSlice';
import ordersSlice from './slices/ordersSlice';
import systemLogsSlice from './slices/systemLogsSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    inventory: inventorySlice,
    users: usersSlice,
    orders: ordersSlice,
    systemLogs: systemLogsSlice,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

