'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './LoginForm.module.scss';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToSignup?: () => void;
  onSwitchToForgotPassword?: () => void;
}

export default function LoginForm({ onSuccess, onSwitchToSignup, onSwitchToForgotPassword }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await login({ email, password });
      if (result.success) {
        onSuccess?.();
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Sign In</h2>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.label}>
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
            placeholder="Enter your email"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="password" className={styles.label}>
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={styles.input}
            placeholder="Enter your password"
          />
        </div>

        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={styles.submitButton}
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      <div className={styles.forgotPasswordLink}>
        <button
          type="button"
          onClick={onSwitchToForgotPassword}
          className={styles.link}
        >
          Forgot your password?
        </button>
      </div>

      <div className={styles.switchLink}>
        <p>
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className={styles.link}
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
