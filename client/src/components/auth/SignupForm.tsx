'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './SignupForm.module.scss';

interface SignupFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export default function SignupForm({ onSuccess, onSwitchToLogin }: SignupFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signup } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
        onSuccess?.();
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
    <div className={styles.container}>
      <h2 className={styles.title}>Create Account</h2>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.nameGrid}>
          <div className={styles.formGroup}>
            <label htmlFor="firstName" className={styles.label}>
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              className={styles.input}
              placeholder="First name"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="lastName" className={styles.label}>
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              className={styles.input}
              placeholder="Last name"
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.label}>
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className={styles.input}
            placeholder="Enter your email"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="phoneNumber" className={styles.label}>
            Phone Number
          </label>
          <input
            type="tel"
            id="phoneNumber"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            required
            className={styles.input}
            placeholder="Enter your phone number"
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
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className={styles.switchLink}>
        <p>
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className={styles.link}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
