'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService } from '@/services/auth';
import { User, LoginUserRequest, CreateUserRequest, AuthResponse, ForgotPasswordRequest, ResetPasswordRequest } from '@/models/User';

interface AuthContextType {
  user: Omit<User, 'password'> | null;
  isAuthenticated: boolean;
  login: (credentials: LoginUserRequest) => Promise<AuthResponse>;
  signup: (userData: CreateUserRequest) => Promise<AuthResponse>;
  forgotPassword: (data: ForgotPasswordRequest) => Promise<AuthResponse>;
  resetPassword: (data: ResetPasswordRequest) => Promise<AuthResponse>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Omit<User, 'password'> | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreAuthState = async () => {
      try {
        // Try to get current user from server using HTTP-only cookie
        const response = await authService.getCurrentUser();
        if (response.success && response.user) {
          // Server confirms user is authenticated, restore user state
          setUser(response.user);
          setIsAuthenticated(true);
        } else {
          // Server says user is not authenticated
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Failed to restore auth state:', error);
        setUser(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    };

    restoreAuthState();
  }, []);

  const login = async (credentials: LoginUserRequest): Promise<AuthResponse> => {
    setLoading(true);
    try {
      const response = await authService.login(credentials);
      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
      } else {
        throw new Error(response.message || 'Login failed');
      }
      return response;
    } catch (err: any) {
      setUser(null);
      setIsAuthenticated(false);
      return { success: false, message: err.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData: CreateUserRequest): Promise<AuthResponse> => {
    setLoading(true);
    try {
      const response = await authService.signup(userData);
      // For email verification flow, we don't set user as authenticated yet
      // The user will be authenticated after email verification and password setup
      return response;
    } catch (err: any) {
      return { success: false, message: err.message || 'Signup failed' };
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (data: ForgotPasswordRequest): Promise<AuthResponse> => {
    try {
      const response = await authService.forgotPassword(data);
      return response;
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to send reset email' };
    }
  };

  const resetPassword = async (data: ResetPasswordRequest): Promise<AuthResponse> => {
    try {
      const response = await authService.resetPassword(data);
      return response;
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to reset password' };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await authService.getCurrentUser();
      if (response.success && response.user) {
        setUser(response.user);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, signup, forgotPassword, resetPassword, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};