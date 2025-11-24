// Authentication API service for client
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: "customer" | "admin" | "store_owner";
  isActive: boolean;
  emailVerified: boolean;
  avatar?: string;
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

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
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
    let url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    // Normalize URL to ensure it has a protocol
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
      url = `http://${url}`;
    }
    this.baseUrl = url;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include", // Include cookies in requests
      ...options,
    };

    try {
      const response = await fetch(url, config);

      // Check content type to ensure we're getting JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response received:", {
          url,
          status: response.status,
          contentType,
          preview: text.substring(0, 200),
        });
        throw new Error(
          `Expected JSON but received ${contentType}. Check if the API URL is correct: ${this.baseUrl}`
        );
      }

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        // For 401 errors, throw a special error that can be handled gracefully
        if (response.status === 401) {
          const authError = new Error(
            errorData.message || "Unauthorized"
          ) as any;
          authError.status = 401;
          authError.isAuthError = true;
          throw authError;
        }
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const data: T = await response.json();
      return data;
    } catch (error) {
      // Only log non-authentication errors (401 is expected when not logged in)
      if (!(error as any)?.isAuthError) {
        console.error("Auth API request failed:", {
          url,
          baseUrl: this.baseUrl,
          error,
        });
      }
      throw error;
    }
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const url = `${this.baseUrl}/api/auth/login`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(credentials),
      });

      // Check content type
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(`Expected JSON but received ${contentType}`);
      }

      const data: AuthResponse = await response.json();

      // For login, we want to return the response even if status is 401 (invalid credentials)
      // This allows the UI to show the error message to the user
      if (!response.ok) {
        // Return the error response from server
        return {
          success: false,
          message: data.message || "Login failed",
        };
      }

      // Token is now stored in HTTP-only cookie, no need to save it
      return data;
    } catch (error: any) {
      // If it's a network error or parsing error, throw it
      if (error.message && !error.message.includes("JSON")) {
        console.error("Login request failed:", error);
      }
      throw error;
    }
  }

  async signup(userData: SignupRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async setupPassword(data: SetupPasswordRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>(
      "/api/auth/setup-password",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );

    // Token is now stored in HTTP-only cookie, no need to save it
    return response;
  }

  async getCurrentUser(): Promise<AuthResponse> {
    try {
      return await this.request<AuthResponse>("/api/auth/me", {
        method: "GET",
      });
    } catch (error: any) {
      if (error?.isAuthError || error?.status === 401) {
        try {
          const refreshResult = await this.refreshToken();
          if (refreshResult.success) {
            return await this.request<AuthResponse>("/api/auth/me", {
              method: "GET",
            });
          }
        } catch (refreshError) {
          throw refreshError;
        }
      }
      throw error;
    }
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async resetPassword(data: ResetPasswordRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/auth/logout", {
      method: "POST",
    });
  }

  async updateProfile(data: UpdateUserRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async uploadAvatar(file: File): Promise<AuthResponse> {
    const formData = new FormData();
    formData.append("avatar", file);

    const url = `${this.baseUrl}/api/auth/avatar`;

    const config: RequestInit = {
      method: "POST",
      credentials: "include",
      body: formData,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const data: AuthResponse = await response.json();
      return data;
    } catch (error) {
      console.error("Avatar upload failed:", error);
      throw error;
    }
  }

  // Check if user is authenticated (no token storage needed)
  isAuthenticated(): boolean {
    // We can't check token validity from frontend anymore since it's HTTP-only
    // This will be determined by the /me endpoint response
    return true; // Always return true, let the server determine validity
  }

  async refreshToken(): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/auth/refresh", {
      method: "POST",
    });
  }

  /**
   * Check if email or phone number is associated with an existing account
   */
  async checkAccountExists(email?: string, phoneNumber?: string): Promise<{
    success: boolean;
    exists: boolean;
    emailExists: boolean;
    phoneExists: boolean;
    message?: string;
  }> {
    const url = `${this.baseUrl}/api/auth/check-account`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, phoneNumber }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Check account exists error:", error);
      return {
        success: false,
        exists: false,
        emailExists: false,
        phoneExists: false,
        message: "Failed to check account. Please try again.",
      };
    }
  }
}

// Export a singleton instance

export const authService = new AuthService();
export default authService;
