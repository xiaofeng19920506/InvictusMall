// Activity Logs API - Used by Dashboard and System Logs pages
import { api } from './client';
import type { ApiResponse } from './types';
import type { ActivityLog } from '../../shared/types/store';

export const activityLogApi = {
  // Get recent activity logs
  getRecentLogs: async (
    limit?: number
  ): Promise<ApiResponse<ActivityLog[]>> => {
    const response = await api.get("/api/activity-logs", {
      params: { limit: limit || 20 },
    });
    return response.data;
  },

  // Get activity logs by store ID
  getLogsByStoreId: async (
    storeId: string,
    limit?: number
  ): Promise<ApiResponse<ActivityLog[]>> => {
    const response = await api.get(`/api/activity-logs/store/${storeId}`, {
      params: { limit: limit || 10 },
    });
    return response.data;
  },

  // Get activity logs by type
  getLogsByType: async (
    type: ActivityLog["type"],
    limit?: number
  ): Promise<ApiResponse<ActivityLog[]>> => {
    const response = await api.get(`/api/activity-logs/type/${type}`, {
      params: { limit: limit || 10 },
    });
    return response.data;
  },
};

