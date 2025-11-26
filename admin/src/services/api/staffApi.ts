// Staff API - Used by Users management page
import { api } from './client';
import type { ApiResponse } from './types';

export interface UpdateStaffRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role?: 'admin' | 'owner' | 'manager' | 'employee';
  department?: string;
  employeeId?: string;
  isActive?: boolean;
}

export interface Staff {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: 'admin' | 'owner' | 'manager' | 'employee';
  department?: string;
  employeeId?: string;
  storeId?: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  canEdit?: boolean;
}

export const staffApi = {
  // Get all staff
  getAllStaff: async (params?: {
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Staff[]>> => {
    const response = await api.get("/api/staff/all", {
      params,
      withCredentials: true,
    });
    return response.data;
  },

  // Update staff member
  updateStaff: async (
    id: string,
    updateData: UpdateStaffRequest
  ): Promise<ApiResponse<Staff>> => {
    const response = await api.put(`/api/staff/${id}`, updateData, {
      withCredentials: true,
    });
    return response.data;
  },
};

