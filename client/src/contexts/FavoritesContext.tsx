'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface FavoritesContextType {
  favorites: string[]; // Store IDs
  addFavorite: (storeId: string) => void;
  removeFavorite: (storeId: string) => void;
  isFavorite: (storeId: string) => boolean;
  toggleFavorite: (storeId: string) => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load favorites from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('favorites');
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to load favorites:', error);
      }
    }
  }, []);

  // Save favorites to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = (storeId: string) => {
    setFavorites(prev => {
      if (!prev.includes(storeId)) {
        return [...prev, storeId];
      }
      return prev;
    });
  };

  const removeFavorite = (storeId: string) => {
    setFavorites(prev => prev.filter(id => id !== storeId));
  };

  const isFavorite = (storeId: string) => {
    return favorites.includes(storeId);
  };

  const toggleFavorite = (storeId: string) => {
    if (isFavorite(storeId)) {
      removeFavorite(storeId);
    } else {
      addFavorite(storeId);
    }
  };

  return (
    <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};

