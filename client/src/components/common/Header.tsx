'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getAvatarUrl } from '@/utils/imageUtils';
import { apiService, type Category } from '@/services/api';
import styles from './Header.module.scss';

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
  const [categories, setCategories] = useState<string[]>(['All']);
  const [loadingCategories, setLoadingCategories] = useState(true);
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

  // Fetch top-level categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const response = await apiService.getTopLevelCategories();
        console.log('Categories API response:', response);
        
        if (response.success && response.data && Array.isArray(response.data)) {
          if (response.data.length > 0) {
            // Map category names and prepend 'All'
            const categoryNames = ['All', ...response.data.map((cat: Category) => cat.name)];
            console.log('Setting categories:', categoryNames);
            setCategories(categoryNames);
          } else {
            console.warn('Categories API returned empty array. Make sure to run: npm run seed-categories');
            // Fallback to default categories if no categories exist
            setCategories(['All', 'Electronics', 'Pet Supplies']);
          }
        } else {
          console.warn('Invalid response structure:', response);
          // Fallback to default categories if response structure is invalid
          setCategories(['All', 'Electronics', 'Pet Supplies']);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Fallback to default categories on error
        setCategories(['All', 'Electronics', 'Pet Supplies']);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

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
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
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
              aria-label="Invictus Mall home"
            >
              Invictus Mall
            </h1>
          </div>
          
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <div className={styles.searchControls}>
              {/* Search Type Selector */}
              <select
                value={searchType}
                onChange={(e) => handleSearchTypeChange(e.target.value)}
                className={`${styles.searchTypeSelect} search-type-dropdown`}
              >
                {searchTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              
              {/* Search Input */}
              <div className={styles.searchInputWrapper}>
                <input
                  type="text"
                  placeholder={`Search ${searchType.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
                <button
                  type="submit"
                  className={styles.searchButton}
                >
                  🔍
                </button>
              </div>
            </div>
          </form>
          
          <div className={styles.headerActions}>
            {isAuthenticated ? (
              <div className={styles.userActions}>
                {/* Dashboard Links */}
                {user?.role === 'admin' && (
                  <Link 
                    href="/admin"
                    className={styles.adminButton}
                  >
                    <span>📊</span>
                    <span>Admin Dashboard</span>
                  </Link>
                )}

                {/* User Dropdown */}
                <div className={styles.userDropdown} ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className={styles.userDropdownButton}
                  >
                    {/* User Avatar or Initials */}
                    {user?.avatar ? (
                      <img
                        src={getAvatarUrl(user.avatar)}
                        alt={`${user.firstName} ${user.lastName}`}
                        className={styles.userAvatar}
                      />
                    ) : (
                      <div className={styles.userInitials}>
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </div>
                    )}
                    <span className={styles.welcomeText}>
                      Welcome, {user?.firstName}
                    </span>
                    {user?.role === 'admin' && (
                      <span className={`${styles.badge} ${styles.admin}`}>
                        Admin
                      </span>
                    )}
                    {user?.role === 'store_owner' && (
                      <span className={`${styles.badge} ${styles.storeOwner}`}>
                        Store Owner
                      </span>
                    )}
                    <span className={styles.dropdownArrow}>▼</span>
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className={styles.dropdownMenu}>
                      <Link
                        href="/profile"
                        onClick={() => setShowDropdown(false)}
                        className={styles.dropdownItem}
                      >
                        <div>
                          <span>👤</span>
                          <span>Profile</span>
                        </div>
                      </Link>
                      <Link
                        href="/orders"
                        onClick={() => setShowDropdown(false)}
                        className={styles.dropdownItem}
                      >
                        <div>
                          <span>📦</span>
                          <span>Orders</span>
                        </div>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className={styles.dropdownItem}
                      >
                        <div>
                          <span>🚪</span>
                          <span>Logout</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.userActions}>
                <Link 
                  href="/login"
                  className={styles.signInButton}
                >
                  <span>👤</span>
                  <span>Sign In</span>
                </Link>
                <Link 
                  href="/signup"
                  className={styles.signUpButton}
                >
                  <span>📝</span>
                  <span>Sign Up</span>
                </Link>
              </div>
            )}
            
            <Link
              href="/cart"
              className={styles.cartButton}
            >
              <span>🛒</span>
              <span>Cart</span>
              {getItemCount() > 0 && (
                <span className={styles.cartBadge}>
                  {getItemCount()}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
      
      {shouldShowCategoryNav && (
      <nav className={styles.categoryNav}>
        <div className={styles.categoryNavContent}>
          <div className={styles.categoryList}>
            {loadingCategories ? (
              <div className={styles.loadingCategories}>Loading categories...</div>
            ) : (
              categories.map((category) => (
                <button
                  key={category}
                  className={`${styles.categoryButton} category-button ${
                    selectedCategory === category
                      ? styles.active
                      : styles.inactive
                  }`}
                  onClick={() => handleCategoryChange(category)}
                >
                  {category}
                </button>
              ))
            )}
          </div>
        </div>
      </nav>
      )}
    </header>
  );
}
