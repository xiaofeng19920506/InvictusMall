import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { LoginRequest, AuthResponse } from '../services/auth';
import './AdminLogin.css';

export default function AdminLogin() {
  const { login, loading } = useAuth();
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: ''
  });
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await login(formData);
      if (!response.success) {
        setError(response.message || 'Login failed');
      }
      // If successful, the AuthContext will handle the state update
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-login-loading">
        <div className="admin-login-loading-content">
          <div className="admin-login-loading-spinner"></div>
          <p className="admin-login-loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-login-container">
      <div className="admin-login-form">
        <div className="admin-login-header">
          <div className="admin-login-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="admin-login-title">
            Admin Login
          </h2>
          <p className="admin-login-subtitle">
            Sign in to access the Invictus Mall Admin Panel
          </p>
        </div>
        
        <form className="admin-login-form-container" onSubmit={handleSubmit}>
          <div className="admin-login-input-group">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="admin-login-input"
              placeholder="Email address"
              value={formData.email}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>
          
          <div className="admin-login-input-group">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="admin-login-input"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className="admin-login-error">
              <div className="admin-login-error-content">
                <svg className="admin-login-error-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="admin-login-error-text">
                  {error}
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="admin-login-button"
          >
            {isSubmitting ? (
              <div className="admin-login-button-content">
                <div className="admin-login-spinner"></div>
                Signing in...
              </div>
            ) : (
              'Sign in'
            )}
          </button>

          <div className="admin-login-footer">
            <p className="admin-login-footer-text">
              Only authorized administrators can access this panel
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
