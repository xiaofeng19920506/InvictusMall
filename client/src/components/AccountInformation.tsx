import { User } from "@/models/User";

interface AccountInformationProps {
  user: User | null;
}

export default function AccountInformation({ user }: AccountInformationProps) {
  if (!user) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Account Information
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">Account Status</p>
          <p className="text-sm font-medium text-gray-900 mt-1">
            {user.isActive ? (
              <span className="text-green-600">✓ Active</span>
            ) : (
              <span className="text-red-600">✗ Inactive</span>
            )}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Email Verification</p>
          <p className="text-sm font-medium text-gray-900 mt-1">
            {user.emailVerified ? (
              <span className="text-green-600">✓ Verified</span>
            ) : (
              <span className="text-yellow-600">⚠ Not Verified</span>
            )}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Member Since</p>
          <p className="text-sm font-medium text-gray-900 mt-1">
            {user.createdAt
              ? new Date(user.createdAt).toLocaleDateString()
              : "N/A"}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Last Login</p>
          <p className="text-sm font-medium text-gray-900 mt-1">
            {user.lastLoginAt
              ? new Date(user.lastLoginAt).toLocaleDateString()
              : "Never"}
          </p>
        </div>
      </div>
    </div>
  );
}

