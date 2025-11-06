'use client';

import { useState, useEffect } from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import ForgotPasswordForm from './ForgotPasswordForm';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="relative bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold cursor-pointer"
          aria-label="Close"
        >
          ×
        </button>
        
        <div className="p-6">
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
