'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setupPasswordAction } from './actions';
import styles from './SetupPasswordForm.module.scss';

interface SetupPasswordFormProps {
  token?: string | null;
}

export default function SetupPasswordForm({ token }: SetupPasswordFormProps) {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      router.push('/');
    }
  }, [token, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    if (!token) {
      setError('Invalid verification token');
      setIsLoading(false);
      return;
    }

    const result = await setupPasswordAction(token, formData.password);
    
    if (result.success) {
      // Mark that user has logged in (for future session restores)
      if (result.user) {
        sessionStorage.setItem('has_logged_in', 'true');
      }
      setSuccess(true);
      // Redirect to home page after 3 seconds
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } else {
      setError(result.message || 'Password setup failed');
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.errorCard}>
          <h1 className={styles.errorTitle}>Invalid Link</h1>
          <p className={styles.errorMessage}>
            This verification link is invalid or has expired.
          </p>
          <button
            onClick={() => router.push('/')}
            className={styles.homeButton}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>✅</div>
          <h1 className={styles.successTitle}>
            Account Activated!
          </h1>
          <p className={styles.successMessage}>
            Your password has been set successfully. Your account is now active
            and you can start shopping!
          </p>
          <p className={styles.successSubtext}>
            Redirecting to home page in 3 seconds...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.formCard}>
        <div className={styles.formHeader}>
          <h1 className={styles.formTitle}>
            Complete Your Registration
          </h1>
          <p className={styles.formDescription}>
            Set up your password to activate your Invictus Mall account
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formField}>
            <label
              htmlFor="password"
              className={styles.formLabel}
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className={styles.formInput}
              placeholder="Enter your password"
              minLength={6}
            />
          </div>

          <div className={styles.formField}>
            <label
              htmlFor="confirmPassword"
              className={styles.formLabel}
            >
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className={styles.formInput}
              placeholder="Confirm your password"
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
            disabled={isLoading}
            className={styles.submitButton}
          >
            {isLoading ? 'Setting up password...' : 'Complete Registration'}
          </button>
        </form>

        <div className={styles.loginLink}>
          <p className={styles.loginText}>
            Already have an account?{' '}
            <button
              onClick={() => router.push('/')}
              className={styles.loginLinkText}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

