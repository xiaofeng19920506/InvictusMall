'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export default function AuthTestComponent() {
  const { user, isAuthenticated, loading, refreshUser } = useAuth();

  useEffect(() => {
    // Auth state monitoring
  }, [user, isAuthenticated, loading]);

  if (loading) {
    return <div className="p-4 bg-blue-100 rounded">🔄 Loading authentication state...</div>;
  }

  if (isAuthenticated && user) {
    return (
      <div className="p-4 bg-green-100 rounded">
        <h3 className="font-bold text-green-800">✅ Authenticated!</h3>
        <p className="text-green-700">Welcome back, {user.firstName}!</p>
        <p className="text-sm text-green-600">Email: {user.email}</p>
        <p className="text-sm text-green-600">Role: {user.role}</p>
        <button 
          onClick={refreshUser}
          className="mt-2 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
        >
          Refresh User Data
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-100 rounded">
      <h3 className="font-bold text-gray-800">❌ Not Authenticated</h3>
      <p className="text-gray-700">Please log in to continue.</p>
    </div>
  );
}
