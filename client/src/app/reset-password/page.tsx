'use client';

import ResetPasswordForm from '@/components/ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900 mb-2">
            Invictus Mall
          </h1>
          <p className="text-center text-gray-600">
            Reset your password to continue shopping
          </p>
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
