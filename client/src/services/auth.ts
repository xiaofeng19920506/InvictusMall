// Authentication API service for client
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'admin' | 'store_owner';
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface SetupPasswordRequest {
  token: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  error?: string;
}

class AuthService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies in requests
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data: T = await response.json();
      return data;
    } catch (error) {
      console.error('Auth API request failed:', error);
      throw error;
    }
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    // Token is now stored in HTTP-only cookie, no need to save it
    return response;
  }

  async signup(userData: SignupRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async setupPassword(data: SetupPasswordRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/api/auth/setup-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    // Token is now stored in HTTP-only cookie, no need to save it
    return response;
  }

  async getCurrentUser(): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/me', {
      method: 'GET',
    });
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/logout', {
      method: 'POST',
    });
  }







  // Check if user is authenticated (no token storage needed)
  isAuthenticated(): boolean {
    // We can't check token validity from frontend anymore since it's HTTP-only
    // This will be determined by the /me endpoint response
    return true; // Always return true, let the server determine validity
  }
}

// Export a singleton instance
export const authService = new AuthService();
export default authService;
