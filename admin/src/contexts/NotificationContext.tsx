import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Notification } from '../components/NotificationSystem';

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  notifications: Notification[];
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration || 5000, // Default 5 seconds
    };
    setNotifications((prev) => [...prev, newNotification]);
  }, []);

  const showSuccess = useCallback((message: string, title: string = 'Success') => {
    showNotification({ type: 'success', title, message });
  }, [showNotification]);

  const showError = useCallback((message: string, title: string = 'Error') => {
    showNotification({ type: 'error', title, message, duration: 7000 }); // Errors stay longer
  }, [showNotification]);

  const showInfo = useCallback((message: string, title: string = 'Info') => {
    showNotification({ type: 'info', title, message });
  }, [showNotification]);

  const showWarning = useCallback((message: string, title: string = 'Warning') => {
    showNotification({ type: 'warning', title, message, duration: 6000 });
  }, [showNotification]);

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        showSuccess,
        showError,
        showInfo,
        showWarning,
        notifications,
        removeNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

