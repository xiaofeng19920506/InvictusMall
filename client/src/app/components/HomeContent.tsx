"use client";

import { useState, useEffect, useCallback, useMemo, useDeferredValue, useTransition } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/common/Header";
import StoreGrid from "../stores/components/StoreGrid";
import StoreGridSkeleton from "@/components/shared/StoreGridSkeleton";
import { useRealTimeStores } from "@/hooks/useRealTimeStores";
import { Store } from "@/services/api";
import styles from "./HomeContent.module.scss";

interface HomeContentProps {
  initialStores: Store[];
  initialSearch: string;
  initialCategory: string;
  initialSearchType: string;
}

export default function HomeContent({
  initialStores,
  initialSearch,
  initialCategory,
  initialSearchType,
}: HomeContentProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchType, setSearchType] = useState(initialSearchType);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Defer search query updates for smoother typing experience
  const deferredSearchQuery = useDeferredValue(searchQuery);
  
  // Use stores hook - fetches on initial load and when search params change
  // Use deferred value for search to avoid blocking UI during typing
  const { stores: realTimeStores, loading, error, refetch, lastUpdated } = useRealTimeStores(
    deferredSearchQuery,
    selectedCategory,
    searchType
  );

  // Use initial stores on first load, then switch to real-time stores
  const stores = useMemo(() => {
    return isInitialLoad && initialStores.length > 0 ? initialStores : realTimeStores;
  }, [isInitialLoad, initialStores, realTimeStores]);
  
  // Show loading only if we don't have initial data and we're loading
  const isLoading = useMemo(() => !isInitialLoad && loading, [isInitialLoad, loading]);

  // Memoize computed title and subtitle
  const title = useMemo(() => {
    if (searchType === "All") {
      return selectedCategory === "All" ? "All Stores" : `${selectedCategory} Stores`;
    }
    return `${searchType} Search Results`;
  }, [searchType, selectedCategory]);

  const subtitle = useMemo(() => {
    const count = stores.length;
    const unit = searchType === "All" ? "store" : searchType.toLowerCase();
    const plural = count !== 1 ? "s" : "";
    const searchText = deferredSearchQuery ? ` for "${deferredSearchQuery}"` : "";
    const typeText = searchType !== "All" ? ` in ${searchType.toLowerCase()}` : "";
    return `${count} ${unit}${plural} found${searchText}${typeText}`;
  }, [stores.length, searchType, deferredSearchQuery]);

  // Update URL when search params change (non-urgent update)
  const updateURL = useCallback((search: string, category: string, type: string) => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category && category !== 'All') params.set('category', category);
      if (type && type !== 'All') params.set('searchType', type);
      
      const queryString = params.toString();
      const newURL = queryString ? `/?${queryString}` : '/';
      router.push(newURL, { scroll: false });
    });
  }, [router, startTransition]);

  // Update URL when search params change
  useEffect(() => {
    if (!isInitialLoad) {
      updateURL(deferredSearchQuery, selectedCategory, searchType);
    }
  }, [deferredSearchQuery, selectedCategory, searchType, isInitialLoad, updateURL]);

  // Mark initial load as complete after first render
  useEffect(() => {
    setIsInitialLoad(false);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleCategoryFilter = useCallback((category: string) => {
    setSelectedCategory(category);
  }, []);

  const handleSearchTypeChange = useCallback((type: string) => {
    setSearchType(type);
  }, []);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <div className={styles.homeContainer}>
      <Header
        onSearch={handleSearch}
        onCategoryFilter={handleCategoryFilter}
        onSearchTypeChange={handleSearchTypeChange}
      />
      <main className={styles.main}>
        <div className={styles.headerSection}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>

        {/* Error State */}
        {error && (
          <div className={styles.errorContainer}>
            <div className={styles.errorContent}>
              <div className={styles.errorLeft}>
                <svg
                  className={styles.errorIcon}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className={styles.errorMessage}>{error}</span>
              </div>
              <button
                onClick={handleRetry}
                className={styles.retryButton}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <div className={styles.storeGridContainer}>
          {isLoading ? (
            <StoreGridSkeleton />
          ) : (
            <StoreGrid stores={stores} />
          )}
        </div>
      </main>
    </div>
  );
}
