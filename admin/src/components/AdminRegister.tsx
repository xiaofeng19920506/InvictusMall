import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../services/auth';
import './AdminLogin.css';

interface RegisterFormData {
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'owner' | 'manager' | 'employee';
  department: string;
  employeeId: string;
}

export default function AdminRegister() {
  const { user } = useAuth();
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    firstName: '',
    lastName: '',
    role: 'employee',
    department: '',
    employeeId: ''
  });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:3001/api/staff/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          department: formData.department || undefined,
          employeeId: formData.employeeId || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Staff invitation sent successfully to ${formData.email}! They will receive an email with setup instructions.`);
        setFormData({
          email: '',
          firstName: '',
          lastName: '',
          role: 'employee',
          department: '',
          employeeId: ''
        });
      } else {
        setError(data.message || 'Failed to send staff invitation');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if current user can register staff
  if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
    return (
      <div className="admin-login-container">
        <div className="admin-login-form">
          <div className="admin-login-header">
            <div className="admin-login-icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="admin-login-title">Access Denied</h2>
            <p className="admin-login-subtitle">
              Only administrators and owners can register new staff members
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-login-container">
      <div className="admin-login-form" style={{ maxWidth: '32rem' }}>
        <div className="admin-login-header">
          <div className="admin-login-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h2 className="admin-login-title">Invite New Staff</h2>
          <p className="admin-login-subtitle">
            Send an invitation to a new staff member
          </p>
        </div>
        
        <form className="admin-login-form-container" onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="admin-login-input-group">
              <input
                name="firstName"
                type="text"
                required
                className="admin-login-input"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            <div className="admin-login-input-group">
              <input
                name="lastName"
                type="text"
                required
                className="admin-login-input"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="admin-login-input-group">
            <input
              name="email"
              type="email"
              required
              className="admin-login-input"
              placeholder="Email address"
              value={formData.email}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="admin-login-input-group">
              <select
                name="role"
                required
                className="admin-login-input"
                value={formData.role}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="admin-login-input-group">
              <input
                name="department"
                type="text"
                className="admin-login-input"
                placeholder="Department (optional)"
                value={formData.department}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="admin-login-input-group">
            <input
              name="employeeId"
              type="text"
              className="admin-login-input"
              placeholder="Employee ID (optional)"
              value={formData.employeeId}
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

          {success && (
            <div style={{ 
              backgroundColor: '#f0f9ff', 
              border: '1px solid #bae6fd', 
              borderRadius: '0.375rem', 
              padding: '1rem', 
              marginBottom: '1.5rem' 
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <svg style={{ width: '1.25rem', height: '1.25rem', color: '#0ea5e9', marginRight: '0.75rem', flexShrink: 0 }} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#0c4a6e' }}>
                  {success}
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
                Sending Invitation...
              </div>
            ) : (
              'Send Invitation'
            )}
          </button>

          <div className="admin-login-footer">
            <p className="admin-login-footer-text">
              The invited staff member will receive an email with setup instructions
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
