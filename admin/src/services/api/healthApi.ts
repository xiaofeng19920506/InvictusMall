// Health API - Used by Dashboard page
import { api } from './client';

export const healthApi = {
  checkHealth: async (): Promise<{
    success: boolean;
    message: string;
    timestamp: string;
    uptime: number;
  }> => {
    const response = await api.get("/health");
    return response.data;
  },
};

