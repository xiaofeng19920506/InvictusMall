import { baseApi } from './baseApi';
import type { ApiResponse } from '../../services/api/types';
import type { ActivityLog } from '../../shared/types/store';
import type { Store } from '../../shared/types/store';

export const activityLogsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get recent activity logs
    getRecentLogs: builder.query<ActivityLog[], number | void>({
      query: (limit = 100) => `/api/activity-logs?limit=${limit}`,
      transformResponse: (response: ApiResponse<ActivityLog[]>) => response.data || [],
      providesTags: [{ type: 'ActivityLogs', id: 'RECENT' }],
      keepUnusedDataFor: 30, // Cache for 30 seconds
    }),

    // Get activity logs by store ID
    getLogsByStoreId: builder.query<ActivityLog[], { storeId: string; limit?: number }>({
      query: ({ storeId, limit = 10 }) => `/api/activity-logs/store/${storeId}?limit=${limit}`,
      transformResponse: (response: ApiResponse<ActivityLog[]>) => response.data || [],
      providesTags: (_result, _error, { storeId }) => [
        { type: 'ActivityLogs', id: `STORE_${storeId}` },
      ],
      keepUnusedDataFor: 30, // Cache for 30 seconds
    }),

    // Get activity logs by type
    getLogsByType: builder.query<
      ActivityLog[],
      { type: ActivityLog['type']; limit?: number }
    >({
      query: ({ type, limit = 10 }) => `/api/activity-logs/type/${type}?limit=${limit}`,
      transformResponse: (response: ApiResponse<ActivityLog[]>) => response.data || [],
      providesTags: (_result, _error, { type }) => [{ type: 'ActivityLogs', id: `TYPE_${type}` }],
      keepUnusedDataFor: 30, // Cache for 30 seconds
    }),

    // Get stores accessible by current staff member (for system logs page)
    getMyStores: builder.query<Store[], void>({
      query: () => '/api/staff/my-stores',
      transformResponse: (response: ApiResponse<Store[]>) => response.data || [],
      providesTags: [{ type: 'Stores', id: 'MY_STORES' }],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),
  }),
});

export const {
  useGetRecentLogsQuery,
  useGetLogsByStoreIdQuery,
  useGetLogsByTypeQuery,
  useGetMyStoresQuery: useGetMyStoresForLogsQuery,
} = activityLogsApi;

