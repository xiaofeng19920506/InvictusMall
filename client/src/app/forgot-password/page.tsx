'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.scss';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const { forgotPassword } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await forgotPassword({ email });
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.message || 'Failed to send reset email');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.headerContainer}>
          <div className={styles.header}>
            <Link href="/" className={styles.logo}>
              <h1 className={styles.logoTitle}>Invictus Mall</h1>
            </Link>
          </div>
        </div>

        <div className={styles.formContainer}>
          <div className={styles.formCard}>
            <div className={styles.successCard}>
              <div className={styles.successIcon}>
                <svg className={styles.successIconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className={styles.successTitle}>Check Your Email</h2>
              <p className={styles.successMessage}>
                If an account with that email exists, we've sent you a password reset link. 
                Please check your email and follow the instructions to reset your password.
              </p>
              <div className={styles.successActions}>
                <Link
                  href="/login"
                  className={styles.submitButton}
                >
                  Back to Sign In
                </Link>
                <Link
                  href="/"
                  className={styles.secondaryButton}
                >
                  Return to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.headerContainer}>
        <div className={styles.header}>
          <Link href="/" className={styles.logo}>
            <h1 className={styles.logoTitle}>Invictus Mall</h1>
          </Link>
          <h2 className={styles.subtitle}>Reset Password</h2>
          <p className={styles.description}>Enter your email address and we'll send you a link to reset your password.</p>
        </div>
      </div>

      <div className={styles.formContainer}>
        <div className={styles.formCard}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formField}>
              <label htmlFor="email" className={styles.formLabel}>
                Email Address
              </label>
              <div className={styles.formInputWrapper}>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.formInput}
                  placeholder="Enter your email address"
                />
              </div>
            </div>

            {error && (
              <div className={styles.errorMessage}>
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={styles.submitButton}
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </form>

          <div className={styles.dividerContainer}>
            <div className={styles.divider}>
              <div className={styles.dividerLine}></div>
              <div className={styles.dividerText}>
                <span className={styles.dividerTextInner}>Remember your password?</span>
              </div>
            </div>

            <div className={styles.loginButton}>
              <Link
                href="/login"
                className={styles.loginLink}
              >
                Sign in instead
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
