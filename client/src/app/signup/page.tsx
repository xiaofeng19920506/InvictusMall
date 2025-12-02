'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.scss';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signup } = useAuth();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signup({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber
      });
      
      if (result.success) {
        router.push('/verify-email');
      } else {
        setError(result.message || 'Signup failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.headerContainer}>
        <div className={styles.header}>
          <Link href="/" className={styles.logo}>
            <h1 className={styles.logoTitle}>Invictus Mall</h1>
          </Link>
          <h2 className={styles.subtitle}>Create Account</h2>
          <p className={styles.description}>Join Invictus Mall and start shopping today!</p>
        </div>
      </div>

      <div className={styles.formContainer}>
        <div className={styles.formCard}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.nameFields}>
              <div className={styles.formField}>
                <label htmlFor="firstName" className={styles.formLabel}>
                  First Name
                </label>
                <div className={styles.formInputWrapper}>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className={styles.formInput}
                    placeholder="First name"
                  />
                </div>
              </div>

              <div className={styles.formField}>
                <label htmlFor="lastName" className={styles.formLabel}>
                  Last Name
                </label>
                <div className={styles.formInputWrapper}>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    className={styles.formInput}
                    placeholder="Last name"
                  />
                </div>
              </div>
            </div>

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
                  value={formData.email}
                  onChange={handleChange}
                  className={styles.formInput}
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div className={styles.formField}>
              <label htmlFor="phoneNumber" className={styles.formLabel}>
                Phone Number
              </label>
              <div className={styles.formInputWrapper}>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className={styles.formInput}
                  placeholder="Enter your phone number"
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
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>

          <div className={styles.dividerContainer}>
            <div className={styles.divider}>
              <div className={styles.dividerLine}></div>
              <div className={styles.dividerText}>
                <span className={styles.dividerTextInner}>Already have an account?</span>
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
