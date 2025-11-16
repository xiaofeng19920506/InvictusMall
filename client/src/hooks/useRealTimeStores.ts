import { useState, useEffect, useCallback } from 'react';
import { apiService, Store } from '@/services/api';

interface UseRealTimeStoresResult {
  stores: Store[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

export const useRealTimeStores = (
  searchQuery?: string,
  selectedCategory?: string,
  searchType?: string
): UseRealTimeStoresResult => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Try to load from cache immediately when search params change
  useEffect(() => {
    const loadFromCache = () => {
      try {
        const queryParams = new URLSearchParams();
        if (selectedCategory && selectedCategory !== 'All') {
          queryParams.append('category', selectedCategory);
        }
        if (searchQuery?.trim()) {
          queryParams.append('search', searchQuery.trim());
        }
        if (searchType && searchType !== 'All') {
          queryParams.append('searchType', searchType);
        }
        const endpoint = `/api/stores${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const cacheKey = `stores_cache_${endpoint}`;
        const cachedData = localStorage.getItem(cacheKey);
        
        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData);
          const cacheAge = Date.now() - timestamp;
          const maxCacheAge = 60 * 60 * 1000; // 1 hour
          
          if (cacheAge < maxCacheAge && data) {
            setStores(data);
            setLastUpdated(new Date(timestamp));
            setLoading(false);
            return true; // Cache loaded
          }
        }
      } catch (error) {
        console.warn('Failed to load from cache:', error);
      }
      return false; // Cache not available or invalid
    };

    if (loadFromCache()) {
      // Cache loaded, but still fetch in background to validate/update
      setLoading(true);
    }
  }, [searchQuery, selectedCategory, searchType]);

  const fetchStores = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await apiService.getAllStores({
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        search: searchQuery?.trim() || undefined,
        searchType: searchType !== 'All' ? searchType : undefined,
      });
      
      if (response.success) {
        setStores(response.data || []);
        setLastUpdated(new Date());
      } else {
        setError('Failed to fetch stores');
      }
    } catch (err) {
      console.error('Error fetching stores:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stores');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, searchType]);

  // Fetch on initial load and whenever search parameters change
  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Manual refetch function
  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchStores();
  }, [fetchStores]);

  return {
    stores,
    loading,
    error,
    refetch,
    lastUpdated
  };
};
