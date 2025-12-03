'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchType, setSearchType] = useState('All');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSearchTypeDropdown, setShowSearchTypeDropdown] = useState(false);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTypeDropdownRef = useRef<HTMLDivElement>(null);
  
  const { user, logout, isAuthenticated } = useAuth();
  const { getItemCount } = useCart();

  // Read category from URL on mount and when pathname changes
  useEffect(() => {
    if (pathname === '/') {
      const params = new URLSearchParams(window.location.search);
      const category = params.get('category') || 'All';
      setSelectedCategory(category);
      const search = params.get('search') || '';
      setSearchQuery(search);
      const type = params.get('searchType') || 'All';
      setSearchType(type);
    }
  }, [pathname]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (searchTypeDropdownRef.current && !searchTypeDropdownRef.current.contains(event.target as Node)) {
        setShowSearchTypeDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch top-level categories on mount (filtered by stores at API level)
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        // Clear any cached category data to ensure fresh fetch
        const cacheKey = 'api_cache_/api/categories?level=1';
        try {
          localStorage.removeItem(cacheKey);
        } catch (e) {
          // Ignore cache clear errors
        }
        
        const response = await apiService.getTopLevelCategories();
        console.log('Categories API response:', response);
        
        if (response.success && response.data && Array.isArray(response.data)) {
          // Map category names and prepend 'All'
          // API already filters to only include categories with stores (directly or via descendants)
          const categoryNames = ['All', ...response.data.map((cat: Category) => cat.name)];
          console.log('Setting categories (filtered by stores):', categoryNames);
          setCategories(categoryNames);
        } else {
          console.warn('Invalid response structure:', response);
          // Fallback if response structure is invalid
          setCategories(['All']);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Fallback on error
        setCategories(['All']);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const searchTypes = useMemo(() => [
    'All',
    'Store',
    'Products'
  ], []);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  }, [onSearch, searchQuery]);

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    if (onCategoryFilter) {
      onCategoryFilter(category);
    }
  }, [onCategoryFilter]);

  // Build URL for category link - memoized
  const getCategoryUrl = useCallback((category: string) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (category && category !== 'All') params.set('category', category);
    if (searchType && searchType !== 'All') params.set('searchType', searchType);
    const queryString = params.toString();
    return queryString ? `/?${queryString}` : '/';
  }, [searchQuery, searchType]);

  const handleSearchTypeChange = useCallback((type: string) => {
    setSearchType(type);
    if (onSearchTypeChange) {
      onSearchTypeChange(type);
    }
  }, [onSearchTypeChange]);

  const handleLogout = useCallback(() => {
    logout();
    setShowDropdown(false);
    router.push('/');
  }, [logout, router]);

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
              {/* Search Type Selector - Custom Dropdown */}
              <div className={styles.searchTypeDropdown} ref={searchTypeDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowSearchTypeDropdown(!showSearchTypeDropdown)}
                  className={styles.searchTypeButton}
                >
                  <span>{searchType}</span>
                  <svg
                    className={`${styles.dropdownIcon} ${showSearchTypeDropdown ? styles.open : ''}`}
                    fill="none"
                    viewBox="0 0 20 20"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M6 8l4 4 4-4"
                    />
                  </svg>
                </button>
                {showSearchTypeDropdown && (
                  <div className={styles.searchTypeDropdownMenu}>
                    {searchTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          handleSearchTypeChange(type);
                          setShowSearchTypeDropdown(false);
                        }}
                        className={`${styles.searchTypeOption} ${
                          searchType === type ? styles.active : ''
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
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
                        href="/profile?tab=orders&orderStatus=all"
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
                <Link
                  key={category}
                  href={getCategoryUrl(category)}
                  className={`${styles.categoryButton} category-button ${
                    selectedCategory === category
                      ? styles.active
                      : styles.inactive
                  }`}
                  onClick={() => handleCategoryChange(category)}
                >
                  {category}
                </Link>
              ))
            )}
          </div>
        </div>
      </nav>
      )}
    </header>
  );
}
