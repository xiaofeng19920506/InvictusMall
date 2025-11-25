import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface HeaderActionsContextType {
  setHeaderActions: (actions: ReactNode) => void;
  clearHeaderActions: () => void;
}

const HeaderActionsContext = createContext<HeaderActionsContextType | undefined>(undefined);

export const HeaderActionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [, setHeaderActionsState] = useState<ReactNode>(null);

  const setHeaderActions = useCallback((actions: ReactNode) => {
    setHeaderActionsState(actions);
  }, []);

  const clearHeaderActions = useCallback(() => {
    setHeaderActionsState(null);
  }, []);

  return (
    <HeaderActionsContext.Provider value={{ setHeaderActions, clearHeaderActions }}>
      {children}
    </HeaderActionsContext.Provider>
  );
};

export const useHeaderActions = () => {
  const context = useContext(HeaderActionsContext);
  if (!context) {
    throw new Error("useHeaderActions must be used within HeaderActionsProvider");
  }
  return context;
};

