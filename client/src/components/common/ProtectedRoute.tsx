'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '../auth/AuthModal';
import { useState } from 'react';
import styles from './ProtectedRoute.module.scss';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'customer' | 'admin' | 'store_owner';
  fallback?: ReactNode;
}

export default function ProtectedRoute({ 
  children, 
  requiredRole, 
  fallback 
}: ProtectedRouteProps) {
  const { isAuthenticated, user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  // If not authenticated, show auth modal or fallback
  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <>
        <div className={styles.authRequiredContainer}>
          <div className={styles.authRequiredContent}>
            <h2 className={styles.authRequiredTitle}>
              Authentication Required
            </h2>
            <p className={styles.authRequiredText}>
              Please sign in to access this page.
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className={styles.authRequiredButton}
            >
              Sign In
            </button>
          </div>
        </div>
        
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode="login"
        />
      </>
    );
  }

  // Check role requirements
  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return (
      <div className={styles.accessDeniedContainer}>
        <div className={styles.accessDeniedContent}>
          <h2 className={styles.accessDeniedTitle}>
            Access Denied
          </h2>
          <p className={styles.accessDeniedText}>
            You don't have permission to access this page.
          </p>
          <p className={styles.accessDeniedRoleText}>
            Required role: {requiredRole} | Your role: {user?.role}
          </p>
        </div>
      </div>
    );
  }

  // User is authenticated and has required role
  return <>{children}</>;
}
