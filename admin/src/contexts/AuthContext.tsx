import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/auth';
import type { User, LoginRequest, AuthResponse } from '../services/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasRestoredRef = React.useRef(false);

  useEffect(() => {
    // Prevent duplicate calls in StrictMode (React 18+)
    if (hasRestoredRef.current) return;
    
    const restoreAuthState = async () => {
      hasRestoredRef.current = true;
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
      } catch (error: any) {
        // Ignore 429 errors (rate limiting) to prevent console spam
        if (error?.response?.status === 429) {
          console.warn('Rate limited during auth restore, will retry later');
        } else {
          console.error('Failed to restore auth state:', error);
        }
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    restoreAuthState();
  }, []);

  const login = async (credentials: LoginRequest): Promise<AuthResponse> => {
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

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, loading }}>
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
