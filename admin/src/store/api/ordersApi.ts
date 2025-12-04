import { baseApi } from './baseApi';
import type { ApiResponse } from '../../services/api/types';
import type { Order, UpdateOrderStatusRequest } from '../../services/api/orderApi';
import type { Store } from '../../shared/types/store';

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all orders
    getAllOrders: builder.query<
      { orders: Order[]; total: number },
      { status?: string; storeId?: string; userId?: string; limit?: number; offset?: number }
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.status) searchParams.append('status', params.status);
        if (params.storeId) searchParams.append('storeId', params.storeId);
        if (params.userId) searchParams.append('userId', params.userId);
        if (params.limit !== undefined) searchParams.append('limit', String(params.limit));
        if (params.offset !== undefined) searchParams.append('offset', String(params.offset));
        return `/api/admin/orders?${searchParams.toString()}`;
      },
      transformResponse: (response: ApiResponse<Order[]>) => {
        const orders = response.data || [];
        const total = (response as any).total || orders.length;
        return { orders, total };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.orders.map(({ id }) => ({ type: 'Orders' as const, id })),
              { type: 'Orders', id: 'LIST' },
            ]
          : [{ type: 'Orders', id: 'LIST' }],
      keepUnusedDataFor: 60, // Cache for 1 minute
    }),

    // Get order by ID
    getOrderById: builder.query<Order, string>({
      query: (orderId) => `/api/admin/orders/${orderId}`,
      transformResponse: (response: ApiResponse<Order>) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Orders', id }],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    // Update order status
    updateOrderStatus: builder.mutation<Order, { orderId: string; data: UpdateOrderStatusRequest }>({
      query: ({ orderId, data }) => ({
        url: `/api/admin/orders/${orderId}/status`,
        method: 'PUT',
        body: data,
      }),
      transformResponse: (response: ApiResponse<Order>) => response.data,
      invalidatesTags: (_result, _error, { orderId }) => [
        { type: 'Orders', id: orderId },
        { type: 'Orders', id: 'LIST' },
      ],
    }),

    // Get stores accessible by current staff member (for orders page)
    getMyStores: builder.query<Store[], void>({
      query: () => '/api/staff/my-stores',
      transformResponse: (response: ApiResponse<Store[]>) => response.data || [],
      providesTags: [{ type: 'Stores', id: 'MY_STORES' }],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),
  }),
});

export const {
  useGetAllOrdersQuery,
  useGetOrderByIdQuery,
  useUpdateOrderStatusMutation,
  useGetMyStoresQuery: useGetMyStoresForOrdersQuery,
} = ordersApi;

