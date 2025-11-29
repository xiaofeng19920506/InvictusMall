import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from './api';
import type {Staff, ApiResponse} from '../types';

class AuthService {
  private readonly STAFF_TOKEN_KEY = 'staff_auth_token';
  private readonly STAFF_USER_KEY = 'staff_user';

  async login(email: string, password: string): Promise<{
    success: boolean;
    user?: Staff;
    token?: string;
    message?: string;
  }> {
    try {
      const response = await apiService['api'].post('/api/staff/login', {
        email,
        password,
      });

      const data = response.data as any;

      // Server response format from ApiResponseHelper.success():
      // { success: true, data: { success: true, user: {...}, token: "...", message: "..." }, message: "..." }
      if (data.success && data.data) {
        const innerData = data.data;
        const user = innerData.user;
        const token = innerData.token;
        
        if (!user) {
          return {
            success: false,
            message: 'Invalid response: user data missing',
          };
        }
        
        if (!token) {
          return {
            success: false,
            message: 'Invalid response: authentication token missing',
          };
        }
        
        // Store token and user
        await AsyncStorage.setItem(this.STAFF_TOKEN_KEY, token);
        await AsyncStorage.setItem(
          this.STAFF_USER_KEY,
          JSON.stringify(user),
        );
        
        return {
          success: true,
          user: user,
          message: innerData.message || data.message || 'Login successful',
          token: token,
        };
      }

      // Fallback: try direct extraction (for backwards compatibility)
      if (data.success && data.user) {
        const token = data.token;
        
        if (token && data.user) {
          await AsyncStorage.setItem(this.STAFF_TOKEN_KEY, token);
          await AsyncStorage.setItem(
            this.STAFF_USER_KEY,
            JSON.stringify(data.user),
          );
          return {
            success: true,
            user: data.user,
            message: data.message || 'Login successful',
            token: token,
          };
        }
      }

      return {
        success: false,
        message: data.message || data.error || 'Login failed: invalid response format',
      };
    } catch (error: any) {
      const errorMessage = 
        error.response?.data?.message || 
        error.response?.data?.error ||
        error.message || 
        'Login failed. Please check your network connection and try again.';
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  async logout(): Promise<void> {
    await AsyncStorage.removeItem(this.STAFF_TOKEN_KEY);
    await AsyncStorage.removeItem(this.STAFF_USER_KEY);
  }

  async getCurrentUser(): Promise<Staff | null> {
    try {
      const userJson = await AsyncStorage.getItem(this.STAFF_USER_KEY);
      if (userJson) {
        return JSON.parse(userJson);
      }

      // Try to fetch from API
      const response = await apiService['api'].get('/api/staff/me');
      const data: ApiResponse<{success: boolean; user: Staff}> = response.data;
      if (data.success && data.data && data.data.user) {
        await AsyncStorage.setItem(
          this.STAFF_USER_KEY,
          JSON.stringify(data.data.user),
        );
        return data.data.user;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem(this.STAFF_TOKEN_KEY);
    return !!token;
  }

  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(this.STAFF_TOKEN_KEY);
  }
}

export const authService = new AuthService();
export default authService;

