'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function StoreOwnerDashboard() {
  const { user } = useAuth();

  return (
    <ProtectedRoute requiredRole="store_owner">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Store Owner Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Welcome back, {user?.firstName}! Manage your store operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Store Stats */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 rounded-full">
                  <span className="text-2xl">📈</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Store Views</h3>
                  <p className="text-3xl font-bold text-orange-500">1,234</p>
                  <p className="text-sm text-green-600">+12% this week</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <span className="text-2xl">⭐</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Rating</h3>
                  <p className="text-3xl font-bold text-blue-500">4.8</p>
                  <p className="text-sm text-gray-600">Based on 89 reviews</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-full">
                  <span className="text-2xl">🛍️</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Products</h3>
                  <p className="text-3xl font-bold text-green-500">156</p>
                  <p className="text-sm text-gray-600">Active listings</p>
                </div>
              </div>
            </div>

            {/* Store Management */}
            <div className="bg-white rounded-lg shadow-md p-6 md:col-span-2 lg:col-span-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Store Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="text-2xl mb-2 block">📝</span>
                  <h4 className="font-medium text-gray-900">Edit Store Info</h4>
                  <p className="text-sm text-gray-600">Update store details</p>
                </button>
                
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="text-2xl mb-2 block">📦</span>
                  <h4 className="font-medium text-gray-900">Manage Products</h4>
                  <p className="text-sm text-gray-600">Add or edit products</p>
                </button>
                
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="text-2xl mb-2 block">📊</span>
                  <h4 className="font-medium text-gray-900">View Analytics</h4>
                  <p className="text-sm text-gray-600">Check store performance</p>
                </button>
              </div>
            </div>

            {/* Recent Reviews */}
            <div className="bg-white rounded-lg shadow-md p-6 md:col-span-2 lg:col-span-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Reviews</h3>
              <div className="space-y-3">
                <div className="flex items-start justify-between py-2 border-b border-gray-100">
                  <div className="flex items-start">
                    <div className="flex items-center mr-3">
                      <span className="text-yellow-500">⭐⭐⭐⭐⭐</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-900">"Great store with excellent customer service!"</p>
                      <p className="text-xs text-gray-500">- Sarah M.</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">1 day ago</span>
                </div>
                
                <div className="flex items-start justify-between py-2 border-b border-gray-100">
                  <div className="flex items-start">
                    <div className="flex items-center mr-3">
                      <span className="text-yellow-500">⭐⭐⭐⭐</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-900">"Good selection, fast delivery."</p>
                      <p className="text-xs text-gray-500">- Mike R.</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">3 days ago</span>
                </div>
                
                <div className="flex items-start justify-between py-2 border-b border-gray-100">
                  <div className="flex items-start">
                    <div className="flex items-center mr-3">
                      <span className="text-yellow-500">⭐⭐⭐⭐⭐</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-900">"Love the quality of products here!"</p>
                      <p className="text-xs text-gray-500">- Emma L.</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">5 days ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
