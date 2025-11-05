import { Suspense } from 'react';
import SetupPasswordForm from './SetupPasswordForm';

interface SetupPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function SetupPasswordPage({ searchParams }: SetupPasswordPageProps) {
  const params = await searchParams;
  const token = params.token;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <SetupPasswordForm token={token} />
    </Suspense>
  );
}
