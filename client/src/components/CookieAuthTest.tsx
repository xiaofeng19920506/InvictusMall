'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

export default function CookieAuthTest() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  useEffect(() => {
    addResult(`Auth State: ${isAuthenticated ? 'Authenticated' : 'Not Authenticated'}`);
    if (user) {
      addResult(`User: ${user.firstName} ${user.lastName} (${user.email})`);
    }
  }, [user, isAuthenticated]);

  const testMeEndpoint = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/me', {
        credentials: 'include',
      });
      const data = await response.json();
      addResult(`/me endpoint: ${data.success ? 'Success' : 'Failed'} - ${data.message}`);
    } catch (error) {
      addResult(`/me endpoint: Error - ${error}`);
    }
  };

  const testLogout = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      addResult(`Logout: ${data.success ? 'Success' : 'Failed'} - ${data.message}`);
    } catch (error) {
      addResult(`Logout: Error - ${error}`);
    }
  };

  if (loading) {
    return <div className="p-4 bg-blue-100 rounded">🔄 Loading authentication state...</div>;
  }

  return (
    <div className="p-4 bg-gray-100 rounded max-w-2xl">
      <h3 className="font-bold text-gray-800 mb-4">🍪 Cookie-Based Authentication Test</h3>
      
      <div className="mb-4">
        <h4 className="font-semibold text-gray-700">Current State:</h4>
        <p className="text-sm text-gray-600">
          Status: {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
        </p>
        {user && (
          <p className="text-sm text-gray-600">
            User: {user.firstName} {user.lastName} ({user.email})
          </p>
        )}
      </div>

      <div className="mb-4 space-x-2">
        <button 
          onClick={testMeEndpoint}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          Test /me Endpoint
        </button>
        <button 
          onClick={testLogout}
          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Test Logout
        </button>
        <button 
          onClick={() => logout()}
          className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
        >
          Logout via Context
        </button>
      </div>

      <div className="bg-white p-3 rounded border">
        <h4 className="font-semibold text-gray-700 mb-2">Test Results:</h4>
        <div className="text-xs text-gray-600 space-y-1 max-h-40 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-400">No tests run yet...</p>
          ) : (
            testResults.map((result, index) => (
              <div key={index} className="font-mono">{result}</div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p><strong>How it works:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li>JWT tokens are stored in HTTP-only cookies (not localStorage)</li>
          <li>Frontend can't access the token directly (more secure)</li>
          <li>All API requests include cookies automatically</li>
          <li>Server validates tokens from cookies, not headers</li>
        </ul>
      </div>
    </div>
  );
}
