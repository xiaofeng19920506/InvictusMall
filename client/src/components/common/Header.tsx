'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getAvatarUrl } from '@/utils/imageUtils';

interface HeaderProps {
  onSearch?: (query: string) => void;
  onCategoryFilter?: (category: string) => void;
  onSearchTypeChange?: (searchType: string) => void;
}

export default function Header({ onSearch, onCategoryFilter, onSearchTypeChange }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchType, setSearchType] = useState('All');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { user, logout, isAuthenticated } = useAuth();
  const { getItemCount } = useCart();
  const router = useRouter();
  const pathname = usePathname();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const categories = [
    'All',
    'Electronics',
    'Fashion',
    'Home & Garden',
    'Sports',
    'Beauty',
    'Books',
    'Food & Kitchen',
    'Pet Supplies'
  ];

  const searchTypes = [
    'All',
    'Store',
    'Products'
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    if (onCategoryFilter) {
      onCategoryFilter(category);
    }
  };

  const handleSearchTypeChange = (type: string) => {
    setSearchType(type);
    if (onSearchTypeChange) {
      onSearchTypeChange(type);
    }
  };

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    router.push('/');
  };

  const shouldShowCategoryNav =
    pathname === '/' && typeof onCategoryFilter === 'function';

  return (
    <header className="bg-gray-900 text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1
              role="link"
              tabIndex={0}
              onClick={() => router.push('/')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  router.push('/');
                }
              }}
              className="text-2xl font-bold text-orange-500 hover:text-orange-400 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              aria-label="Invictus Mall home"
            >
              Invictus Mall
            </h1>
          </div>
          
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-8">
            <div className="flex gap-2">
              {/* Search Type Selector */}
              <select
                value={searchType}
                onChange={(e) => handleSearchTypeChange(e.target.value)}
                className="px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors search-type-dropdown"
              >
                {searchTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              
              {/* Search Input */}
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder={`Search ${searchType.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pr-10 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  🔍
                </button>
              </div>
            </div>
          </form>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                {/* Dashboard Links */}
                {user?.role === 'admin' && (
                  <Link 
                    href="/admin"
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors cursor-pointer"
                  >
                    <span>📊</span>
                    <span>Admin Dashboard</span>
                  </Link>
                )}
                
                {user?.role === 'store_owner' && (
                  <Link 
                    href="/store-owner"
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
                  >
                    <span>🏪</span>
                    <span>My Store</span>
                  </Link>
                )}

                {/* User Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    {/* User Avatar or Initials */}
                    {user?.avatar ? (
                      <img
                        src={getAvatarUrl(user.avatar)}
                        alt={`${user.firstName} ${user.lastName}`}
                        className="w-8 h-8 rounded-full border-2 border-white"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </div>
                    )}
                    <span className="text-sm text-gray-300">
                      Welcome, {user?.firstName}
                    </span>
                    {user?.role === 'admin' && (
                      <span className="px-2 py-1 text-xs bg-orange-500 text-white rounded-full">
                        Admin
                      </span>
                    )}
                    {user?.role === 'store_owner' && (
                      <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded-full">
                        Store Owner
                      </span>
                    )}
                    <span className="text-gray-400">▼</span>
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50 border border-gray-200">
                      <Link
                        href="/profile"
                        onClick={() => setShowDropdown(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center space-x-2">
                          <span>👤</span>
                          <span>Profile</span>
                        </div>
                      </Link>
                      <Link
                        href="/orders"
                        onClick={() => setShowDropdown(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center space-x-2">
                          <span>📦</span>
                          <span>Orders</span>
                        </div>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center space-x-2">
                          <span>🚪</span>
                          <span>Logout</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link 
                  href="/login"
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <span>👤</span>
                  <span>Sign In</span>
                </Link>
                <Link 
                  href="/signup"
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors cursor-pointer"
                >
                  <span>📝</span>
                  <span>Sign Up</span>
                </Link>
              </div>
            )}
            
            <Link
              href="/cart"
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors relative cursor-pointer"
            >
              <span>🛒</span>
              <span>Cart</span>
              {getItemCount() > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {getItemCount()}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
      
      {shouldShowCategoryNav && (
      <nav className="bg-gray-800 border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto py-2">
            {categories.map((category) => (
              <button
                key={category}
                className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors category-button cursor-pointer ${
                  selectedCategory === category
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-300'
                }`}
                onClick={() => handleCategoryChange(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </nav>
      )}
    </header>
  );
}
