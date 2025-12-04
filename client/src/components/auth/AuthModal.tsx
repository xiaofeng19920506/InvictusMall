'use client';

import { useState, useEffect } from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import ForgotPasswordForm from './ForgotPasswordForm';
import styles from './AuthModal.module.scss';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup' | 'forgot-password';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot-password'>(initialMode);

  // Update mode when initialMode prop changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  if (!isOpen) return null;

  const handleSuccess = () => {
    onClose();
  };

  const switchToSignup = () => {
    setMode('signup');
  };

  const switchToLogin = () => {
    setMode('login');
  };

  const switchToForgotPassword = () => {
    setMode('forgot-password');
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button
          onClick={onClose}
          className={styles.closeButton}
          aria-label="Close"
        >
          ×
        </button>
        
        <div className={styles.content}>
          {mode === 'login' ? (
            <LoginForm 
              onSuccess={handleSuccess}
              onSwitchToSignup={switchToSignup}
              onSwitchToForgotPassword={switchToForgotPassword}
            />
          ) : mode === 'signup' ? (
            <SignupForm 
              onSuccess={handleSuccess}
              onSwitchToLogin={switchToLogin}
            />
          ) : (
            <ForgotPasswordForm 
              onSuccess={handleSuccess}
              onSwitchToLogin={switchToLogin}
            />
          )}
        </div>
      </div>
    </div>
  );
}
