interface VerifyEmailContentProps {
  countdown: number;
}

export default function VerifyEmailContent({ countdown }: VerifyEmailContentProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
        <div className="text-orange-500 text-6xl mb-4">📧</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Verifying Email...</h1>
        <p className="text-gray-600 mb-4">
          Please wait while we verify your email address and redirect you to complete your registration.
        </p>
        <div className="mt-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          Redirecting in <span className="font-bold text-orange-500 text-lg">{countdown}</span> {countdown === 1 ? 'second' : 'seconds'}...
        </p>
      </div>
    </div>
  );
}
