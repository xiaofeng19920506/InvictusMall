import { baseApi } from './baseApi';
import type { ApiResponse } from '../../services/api/types';
import type { Staff, UpdateStaffRequest } from '../../services/api/staffApi';
import type { Store } from '../../shared/types/store';

export const staffApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all staff
    getAllStaff: builder.query<
      { staff: Staff[]; total: number },
      { limit?: number; offset?: number; forStoreCreation?: boolean }
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.limit !== undefined) searchParams.append('limit', String(params.limit));
        if (params.offset !== undefined) searchParams.append('offset', String(params.offset));
        if (params.forStoreCreation !== undefined)
          searchParams.append('forStoreCreation', String(params.forStoreCreation));
        return `/api/staff/all?${searchParams.toString()}`;
      },
      transformResponse: (response: ApiResponse<Staff[]>) => {
        const staff = response.data || [];
        const total = (response as any).total || staff.length;
        return { staff, total };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.staff.map(({ id }) => ({ type: 'Staff' as const, id })),
              { type: 'Staff', id: 'LIST' },
            ]
          : [{ type: 'Staff', id: 'LIST' }],
      keepUnusedDataFor: 60, // Cache for 1 minute
    }),

    // Get stores accessible by current staff member
    getMyStores: builder.query<Store[], void>({
      query: () => '/api/staff/my-stores',
      transformResponse: (response: ApiResponse<Store[]>) => response.data || [],
      providesTags: [{ type: 'Stores', id: 'MY_STORES' }],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    // Update staff member
    updateStaff: builder.mutation<Staff, { id: string; data: UpdateStaffRequest }>({
      query: ({ id, data }) => ({
        url: `/api/staff/${id}`,
        method: 'PUT',
        body: data,
      }),
      transformResponse: (response: ApiResponse<Staff>) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Staff', id },
        { type: 'Staff', id: 'LIST' },
      ],
    }),

    // Invite staff member
    inviteStaff: builder.mutation<
      { emailSent: boolean; invitation: any },
      {
        email: string;
        firstName: string;
        lastName: string;
        role: 'admin' | 'owner' | 'manager' | 'employee';
        department?: string;
        employeeId?: string;
        storeId?: string;
      }
    >({
      query: (data) => ({
        url: '/api/staff/invite',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiResponse<any>) => response.data,
      invalidatesTags: [{ type: 'Staff', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetAllStaffQuery,
  useGetMyStoresQuery,
  useUpdateStaffMutation,
  useInviteStaffMutation,
} = staffApi;

