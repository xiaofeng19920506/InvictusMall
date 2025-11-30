import { baseApi } from './baseApi';
import type { ApiResponse } from '../../services/api/types';
import type { Store, CreateStoreRequest, UpdateStoreRequest } from '../../shared/types/store';

export const storesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all stores
    getAllStores: builder.query<
      Store[],
      { category?: string; search?: string; limit?: number; offset?: number } | void
    >({
      query: (params) => {
        if (!params) return '/api/stores';
        const searchParams = new URLSearchParams();
        if (params.category) searchParams.append('category', params.category);
        if (params.search) searchParams.append('search', params.search);
        if (params.limit !== undefined) searchParams.append('limit', String(params.limit));
        if (params.offset !== undefined) searchParams.append('offset', String(params.offset));
        return `/api/stores?${searchParams.toString()}`;
      },
      transformResponse: (response: ApiResponse<Store[]>) => response.data || [],
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Stores' as const, id })),
              { type: 'Stores', id: 'LIST' },
            ]
          : [{ type: 'Stores', id: 'LIST' }],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    // Get store by ID
    getStoreById: builder.query<Store, string>({
      query: (id) => `/api/stores/${id}`,
      transformResponse: (response: ApiResponse<Store>) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Stores', id }],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    // Create store
    createStore: builder.mutation<Store, CreateStoreRequest>({
      query: (data) => ({
        url: '/api/stores',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiResponse<Store>) => response.data,
      invalidatesTags: [{ type: 'Stores', id: 'LIST' }],
    }),

    // Update store
    updateStore: builder.mutation<Store, { id: string; data: UpdateStoreRequest }>({
      query: ({ id, data }) => ({
        url: `/api/stores/${id}`,
        method: 'PUT',
        body: data,
      }),
      transformResponse: (response: ApiResponse<Store>) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Stores', id },
        { type: 'Stores', id: 'LIST' },
      ],
    }),

    // Delete store
    deleteStore: builder.mutation<void, string>({
      query: (id) => ({
        url: `/api/stores/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Stores', id },
        { type: 'Stores', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetAllStoresQuery,
  useGetStoreByIdQuery,
  useCreateStoreMutation,
  useUpdateStoreMutation,
  useDeleteStoreMutation,
} = storesApi;

