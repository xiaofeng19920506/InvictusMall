'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Welcome back, {user?.firstName}! Manage your mall operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Stats Cards */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 rounded-full">
                  <span className="text-2xl">🏪</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Total Stores</h3>
                  <p className="text-3xl font-bold text-orange-500">24</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <span className="text-2xl">👥</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Total Users</h3>
                  <p className="text-3xl font-bold text-blue-500">1,234</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-full">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Revenue</h3>
                  <p className="text-3xl font-bold text-green-500">$45.2K</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-6 md:col-span-2 lg:col-span-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="text-2xl mb-2 block">➕</span>
                  <h4 className="font-medium text-gray-900">Add New Store</h4>
                  <p className="text-sm text-gray-600">Register a new store</p>
                </button>
                
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="text-2xl mb-2 block">📊</span>
                  <h4 className="font-medium text-gray-900">View Analytics</h4>
                  <p className="text-sm text-gray-600">Check performance metrics</p>
                </button>
                
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="text-2xl mb-2 block">⚙️</span>
                  <h4 className="font-medium text-gray-900">System Settings</h4>
                  <p className="text-sm text-gray-600">Configure mall settings</p>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-md p-6 md:col-span-2 lg:col-span-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center">
                    <span className="text-orange-500 mr-3">🏪</span>
                    <span className="text-sm text-gray-900">New store "Tech Hub" registered</span>
                  </div>
                  <span className="text-xs text-gray-500">2 hours ago</span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center">
                    <span className="text-blue-500 mr-3">👤</span>
                    <span className="text-sm text-gray-900">User "John Doe" signed up</span>
                  </div>
                  <span className="text-xs text-gray-500">4 hours ago</span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center">
                    <span className="text-green-500 mr-3">✅</span>
                    <span className="text-sm text-gray-900">Store "Fashion World" verified</span>
                  </div>
                  <span className="text-xs text-gray-500">6 hours ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
