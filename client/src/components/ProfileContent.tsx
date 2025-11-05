"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProfileForm from "@/components/ProfileForm";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import AddressManager from "@/components/AddressManager";
import Header from "@/components/Header";
import Link from "next/link";

export default function ProfileContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "profile" | "password" | "addresses"
  >("profile");

  return (
    <ProtectedRoute>
      <>
        <Header />
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
              <p className="text-gray-600 mt-2">
                Manage your account settings and preferences
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="mb-6 border-b border-gray-200">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`border-b-2 py-4 px-1 text-sm font-medium ${
                    activeTab === "profile"
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab("password")}
                  className={`border-b-2 py-4 px-1 text-sm font-medium ${
                    activeTab === "password"
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Password
                </button>
                <button
                  onClick={() => setActiveTab("addresses")}
                  className={`border-b-2 py-4 px-1 text-sm font-medium ${
                    activeTab === "addresses"
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Addresses
                </button>
                <Link
                  href="/orders"
                  className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
                >
                  Orders
                </Link>
              </nav>
            </div>

            {/* Account Info Section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Account Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Account Status</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {user?.isActive ? (
                      <span className="text-green-600">✓ Active</span>
                    ) : (
                      <span className="text-red-600">✗ Inactive</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email Verification</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {user?.emailVerified ? (
                      <span className="text-green-600">✓ Verified</span>
                    ) : (
                      <span className="text-yellow-600">⚠ Not Verified</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Member Since</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Login</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {user?.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString()
                      : "Never"}
                  </p>
                </div>
              </div>
            </div>

            {/* Content based on active tab */}
            {activeTab === "profile" && <ProfileForm />}
            {activeTab === "password" && <ChangePasswordForm />}
            {activeTab === "addresses" && (
              <AddressManager
                addresses={[]} // TODO: Load from API
                onSave={async (address) => {
                  // TODO: Implement API call to save address
                }}
                onDelete={async (id) => {
                  // TODO: Implement API call to delete address
                }}
                onSetDefault={async (id) => {
                  // TODO: Implement API call to set default address
                }}
              />
            )}
          </div>
        </div>
      </>
    </ProtectedRoute>
  );
}

