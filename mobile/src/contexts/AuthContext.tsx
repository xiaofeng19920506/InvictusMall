import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';
import authService from '../services/auth';
import type {Staff} from '../types';

interface AuthContextType {
  user: Staff | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{success: boolean; message?: string}>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [user, setUser] = useState<Staff | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isAuth = await authService.isAuthenticated();
      if (isAuth) {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('[AuthContext] 🔐 Login attempt started');
      const result = await authService.login(email, password);
      console.log('[AuthContext] 📦 Login result:', {
        success: result.success,
        hasUser: !!result.user,
        message: result.message,
      });
      
      if (result.success && result.user) {
        console.log('[AuthContext] ✅ Setting user in context:', result.user.email);
        setUser(result.user);
      } else {
        console.error('[AuthContext] ❌ Login failed:', result.message);
      }
      return result;
    } catch (error: any) {
      console.error('[AuthContext] ❌ Login exception:', error);
      return {
        success: false,
        message: error.message || 'Login failed',
      };
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}>
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

