'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  price: number;
  quantity: number;
  storeId: string;
  storeName: string;
  // Reservation fields (only for services)
  reservationDate?: string;
  reservationTime?: string;
  reservationNotes?: string;
  isReservation?: boolean;
  // Save for later
  savedForLater?: boolean;
}

interface CartContextType {
  items: CartItem[];
  savedItems: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  saveForLater: (id: string) => void;
  moveToCart: (id: string) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [savedItems, setSavedItems] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('cart');
    const storedSaved = localStorage.getItem('savedItems');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setItems(parsed.filter((item: CartItem) => !item.savedForLater));
        setSavedItems(parsed.filter((item: CartItem) => item.savedForLater));
      } catch (error) {
        console.error('Failed to load cart:', error);
      }
    }
    if (storedSaved) {
      try {
        setSavedItems(JSON.parse(storedSaved));
      } catch (error) {
        console.error('Failed to load saved items:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify([...items, ...savedItems]));
    localStorage.setItem('savedItems', JSON.stringify(savedItems));
  }, [items, savedItems]);

  const addItem = (item: Omit<CartItem, 'id'>) => {
    setItems(prev => {
      // For reservations, check if same reservation already exists (same service, date, and time)
      if (item.isReservation && item.reservationDate && item.reservationTime) {
        const existingReservationIndex = prev.findIndex(
          i => 
            i.productId === item.productId && 
            i.storeId === item.storeId &&
            i.isReservation &&
            i.reservationDate === item.reservationDate &&
            i.reservationTime === item.reservationTime
        );

        if (existingReservationIndex >= 0) {
          // Reservation with same date/time already exists, don't add duplicate
          return prev;
        }
      } else {
        // For regular products, check if item already exists in cart
        const existingIndex = prev.findIndex(
          i => i.productId === item.productId && i.storeId === item.storeId && !i.isReservation
        );

        if (existingIndex >= 0) {
          // Update quantity if item exists
          const updated = [...prev];
          updated[existingIndex].quantity += item.quantity;
          return updated;
        }
      }

      // Add new item (generate unique ID for reservations)
      const itemId = item.isReservation && item.reservationDate && item.reservationTime
        ? `${item.storeId}-${item.productId}-${item.reservationDate}-${item.reservationTime}`
        : `${item.storeId}-${item.productId}`;
      
      return [...prev, { ...item, id: itemId }];
    });
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const saveForLater = (id: string) => {
    const item = items.find(i => i.id === id);
    if (item) {
      setItems(prev => prev.filter(i => i.id !== id));
      setSavedItems(prev => [...prev, { ...item, savedForLater: true }]);
    }
  };

  const moveToCart = (id: string) => {
    const item = savedItems.find(i => i.id === id);
    if (item) {
      setSavedItems(prev => prev.filter(i => i.id !== id));
      setItems(prev => [...prev, { ...item, savedForLater: false }]);
    }
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotal = () => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getItemCount = () => {
    return items.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        savedItems,
        addItem,
        removeItem,
        updateQuantity,
        saveForLater,
        moveToCart,
        clearCart,
        getTotal,
        getItemCount
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

