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

      const data: ApiResponse<{
        success: boolean;
        user: Staff;
        token: string;
        message: string;
      }> = response.data;

      if (data.success && data.data) {
        const innerData = data.data;
        if (innerData.token) {
          await AsyncStorage.setItem(this.STAFF_TOKEN_KEY, innerData.token);
        }
        if (innerData.user) {
          await AsyncStorage.setItem(
            this.STAFF_USER_KEY,
            JSON.stringify(innerData.user),
          );
        }
        return {
          success: true,
          user: innerData.user,
          message: innerData.message || data.message || 'Login successful',
          token: innerData.token,
        };
      }

      return {
        success: false,
        message: data.message || 'Login failed',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
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

