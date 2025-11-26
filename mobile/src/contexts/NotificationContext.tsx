import React, {createContext, useContext, useState, ReactNode} from 'react';
import {Alert} from 'react-native';

interface NotificationContextType {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const showSuccess = (message: string) => {
    Alert.alert('Success', message);
  };

  const showError = (message: string) => {
    Alert.alert('Error', message);
  };

  const showInfo = (message: string) => {
    Alert.alert('Info', message);
  };

  return (
    <NotificationContext.Provider value={{showSuccess, showError, showInfo}}>
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

