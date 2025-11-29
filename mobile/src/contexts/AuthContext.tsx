import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/auth';
import apiService from '../services/api';
import type {Staff, Store} from '../types';

interface AuthContextType {
  user: Staff | null;
  stores: Store[];
  selectedStore: Store | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{success: boolean; message?: string}>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  selectStore: (store: Store | null) => void;
  refreshStores: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORES_KEY = 'user_stores';
const SELECTED_STORE_KEY = 'selected_store';

export const AuthProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [user, setUser] = useState<Staff | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  // Load stores and selected store when user changes
  useEffect(() => {
    if (user) {
      loadStores();
      loadSelectedStore();
    } else {
      setStores([]);
      setSelectedStore(null);
      AsyncStorage.removeItem(STORES_KEY);
      AsyncStorage.removeItem(SELECTED_STORE_KEY);
    }
  }, [user]);

  const loadStores = async () => {
    try {
      // Try to load from storage first
      const storedStores = await AsyncStorage.getItem(STORES_KEY);
      if (storedStores) {
        const parsed = JSON.parse(storedStores);
        setStores(parsed);
      }

      // Fetch fresh data from API
      await refreshStores();
    } catch (error) {
      console.error('Error loading stores:', error);
    }
  };

  const loadSelectedStore = async () => {
    try {
      const stored = await AsyncStorage.getItem(SELECTED_STORE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSelectedStore(parsed);
      }
    } catch (error) {
      console.error('Error loading selected store:', error);
    }
  };

  const refreshStores = async () => {
    try {
      const response = await apiService.getMyStores();
      if (response.success && response.data) {
        const fetchedStores = response.data;
        setStores(fetchedStores);
        await AsyncStorage.setItem(STORES_KEY, JSON.stringify(fetchedStores));

        // If no store is selected yet, select the first one (or user's storeId if exists)
        if (!selectedStore && fetchedStores.length > 0) {
          let storeToSelect = fetchedStores[0];
          
          // If user has a storeId, try to match it
          if (user?.storeId) {
            const matchedStore = fetchedStores.find((s) => s.id === user.storeId);
            if (matchedStore) {
              storeToSelect = matchedStore;
            }
          }

          selectStore(storeToSelect);
        }
      }
    } catch (error) {
      console.error('Error refreshing stores:', error);
    }
  };

  const selectStore = async (store: Store | null) => {
    setSelectedStore(store);
    if (store) {
      await AsyncStorage.setItem(SELECTED_STORE_KEY, JSON.stringify(store));
    } else {
      await AsyncStorage.removeItem(SELECTED_STORE_KEY);
    }
  };

  const checkAuth = async () => {
    try {
      const isAuth = await authService.isAuthenticated();
      if (isAuth) {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      }
    } catch (error) {
      // Error checking auth - silently fail
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const result = await authService.login(email, password);
      
      if (result.success && result.user) {
        setUser(result.user);
        // Stores will be loaded automatically via useEffect when user is set
      }
      return result;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Login failed',
      };
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setStores([]);
    setSelectedStore(null);
    await AsyncStorage.removeItem(STORES_KEY);
    await AsyncStorage.removeItem(SELECTED_STORE_KEY);
  };

  const refreshUser = async () => {
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        stores,
        selectedStore,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
        selectStore,
        refreshStores,
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

