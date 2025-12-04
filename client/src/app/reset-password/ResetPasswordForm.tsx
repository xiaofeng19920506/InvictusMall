'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { resetPasswordAction } from './actions';
import styles from './ResetPasswordForm.module.scss';

interface ResetPasswordFormProps {
  token?: string | null;
}

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!token) {
      setError('Invalid or missing reset token');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    const result = await resetPasswordAction(token, password);
    
    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } else {
      setError(result.message || 'Failed to reset password');
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.formCard}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>
            <svg className={styles.successIconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className={styles.successTitle}>Password Reset Successful</h2>
          <p className={styles.successMessage}>
            Your password has been successfully reset. You will be redirected to the home page shortly.
          </p>
          <div className={styles.redirectSpinner}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.formCard}>
      <h2 className={styles.formTitle}>Reset Your Password</h2>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formField}>
          <label htmlFor="password" className={styles.formLabel}>
            New Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={styles.formInput}
            placeholder="Enter your new password"
            minLength={6}
          />
        </div>

        <div className={styles.formField}>
          <label htmlFor="confirmPassword" className={styles.formLabel}>
            Confirm New Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className={styles.formInput}
            placeholder="Confirm your new password"
            minLength={6}
          />
        </div>

        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !token}
          className={styles.submitButton}
        >
          {isLoading ? 'Resetting Password...' : 'Reset Password'}
        </button>
      </form>

      <div className={styles.loginLink}>
        <p className={styles.loginText}>
          Remember your password?{' '}
          <button
            type="button"
            onClick={() => router.push('/')}
            className={styles.loginLinkText}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

