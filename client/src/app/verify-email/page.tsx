'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      // Redirect to password setup page with the token
      router.push(`/setup-password?token=${token}`);
    } else {
      // No token, redirect to home
      router.push('/');
    }
  }, [token, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
        <div className="text-orange-500 text-6xl mb-4">📧</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Verifying Email...</h1>
        <p className="text-gray-600">
          Please wait while we verify your email address and redirect you to complete your registration.
        </p>
        <div className="mt-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
        </div>
      </div>
    </div>
  );
}
