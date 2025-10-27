import axios from 'axios';

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: 'admin' | 'owner' | 'manager' | 'employee';
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}

export interface ApiError {
  message: string;
}

// Role hierarchy and permissions
export const ROLE_HIERARCHY = {
  admin: 4,
  owner: 3,
  manager: 2,
  employee: 1
} as const;

export const ROLE_PERMISSIONS = {
  admin: [
    'dashboard',
    'stores',
    'users',
    'settings',
    'analytics',
    'system_logs',
    'user_management',
    'store_management',
    'role_management'
  ],
  owner: [
    'dashboard',
    'stores',
    'users',
    'settings',
    'analytics',
    'user_management',
    'store_management'
  ],
  manager: [
    'dashboard',
    'stores',
    'users',
    'analytics',
    'store_management'
  ],
  employee: [
    'dashboard',
    'stores'
  ]
} as const;

export type Role = keyof typeof ROLE_HIERARCHY;
export type Permission = typeof ROLE_PERMISSIONS[Role][number];

class AuthService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    // Configure axios defaults
    axios.defaults.baseURL = this.baseUrl;
    axios.defaults.withCredentials = true; // Include cookies
    axios.defaults.headers.common['Content-Type'] = 'application/json';
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await axios.post('/api/staff/login', credentials);
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw new Error(error.message || 'Login failed');
    }
  }

  async getCurrentUser(): Promise<AuthResponse> {
    try {
      const response = await axios.get('/api/staff/me');
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw new Error(error.message || 'Failed to get current user');
    }
  }

  async logout(): Promise<AuthResponse> {
    try {
      const response = await axios.post('/api/staff/logout');
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw new Error(error.message || 'Logout failed');
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    // We can't check token validity from frontend since it's HTTP-only
    // This will be determined by the /me endpoint response
    return true; // Always return true, let the server determine validity
  }

  // Check if user has a specific permission
  hasPermission(user: User, permission: string): boolean {
    return ROLE_PERMISSIONS[user.role].includes(permission as any);
  }

  // Check if user has minimum role level
  hasMinimumRole(user: User, minimumRole: Role): boolean {
    return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[minimumRole];
  }

  // Get user's permissions
  getUserPermissions(user: User): string[] {
    return [...ROLE_PERMISSIONS[user.role]];
  }
}

// Export a singleton instance
export const authService = new AuthService();
export default authService;