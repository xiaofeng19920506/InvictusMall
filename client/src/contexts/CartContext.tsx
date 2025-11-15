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
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('cart');
    if (stored) {
      try {
        setItems(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to load cart:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

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
        addItem,
        removeItem,
        updateQuantity,
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

