import { useEffect, useCallback, type ReactNode } from "react";

export const useAdminHeader = () => {
  const setHeaderActions = useCallback((actions: ReactNode) => {
    if ((window as any).__setAdminHeaderActions) {
      (window as any).__setAdminHeaderActions(actions);
    }
  }, []);

  const clearHeaderActions = useCallback(() => {
    if ((window as any).__setAdminHeaderActions) {
      (window as any).__setAdminHeaderActions(null);
    }
  }, []);

  useEffect(() => {
    // Clear header actions when component unmounts
    return () => {
      clearHeaderActions();
    };
  }, [clearHeaderActions]);

  return { setHeaderActions, clearHeaderActions };
};

