import Link from "next/link";

interface ProfileNavigationTabsProps {
  activeTab: "profile" | "password" | "addresses";
}

export default function ProfileNavigationTabs({ activeTab }: ProfileNavigationTabsProps) {
  return (
    <div className="mb-6 border-b border-gray-200">
      <nav className="flex space-x-8">
        <Link
          href="/profile?tab=profile"
          className={`border-b-2 py-4 px-1 text-sm font-medium cursor-pointer ${
            activeTab === "profile"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Profile
        </Link>
        <Link
          href="/profile?tab=password"
          className={`border-b-2 py-4 px-1 text-sm font-medium cursor-pointer ${
            activeTab === "password"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Password
        </Link>
        <Link
          href="/profile?tab=addresses"
          className={`border-b-2 py-4 px-1 text-sm font-medium cursor-pointer ${
            activeTab === "addresses"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Addresses
        </Link>
      </nav>
    </div>
  );
}

