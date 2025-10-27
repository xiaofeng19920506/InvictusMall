'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './AuthModal';
import Link from 'next/link';

interface HeaderProps {
  onSearch?: (query: string) => void;
  onCategoryFilter?: (category: string) => void;
  onSearchTypeChange?: (searchType: string) => void;
}

export default function Header({ onSearch, onCategoryFilter, onSearchTypeChange }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchType, setSearchType] = useState('All');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  
  const { user, logout, isAuthenticated } = useAuth();

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

  const openAuthModal = (mode: 'login' | 'signup') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-gray-900 text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-orange-500">Invictus Mall</h1>
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
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  🔍
                </button>
              </div>
            </div>
          </form>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
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
                </div>
                
                {/* Dashboard Links */}
                {user?.role === 'admin' && (
                  <Link 
                    href="/admin"
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <span>📊</span>
                    <span>Admin Dashboard</span>
                  </Link>
                )}
                
                {user?.role === 'store_owner' && (
                  <Link 
                    href="/store-owner"
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <span>🏪</span>
                    <span>My Store</span>
                  </Link>
                )}
                
                <button 
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <span>🚪</span>
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => openAuthModal('login')}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <span>👤</span>
                  <span>Sign In</span>
                </button>
                <button 
                  onClick={() => openAuthModal('signup')}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <span>📝</span>
                  <span>Sign Up</span>
                </button>
              </div>
            )}
            
            <button className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
              <span>❤️</span>
              <span>Favorites</span>
            </button>
          </div>
        </div>
      </div>
      
      <nav className="bg-gray-800 border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto py-2">
            {categories.map((category) => (
              <button
                key={category}
                className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors category-button ${
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
      
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        initialMode={authModalMode}
      />
    </header>
  );
}
