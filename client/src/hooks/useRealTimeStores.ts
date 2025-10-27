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
  searchType?: string,
  refreshInterval: number = 30000 // 30 seconds default
): UseRealTimeStoresResult => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStores = useCallback(async () => {
    try {
      setError(null);
      
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

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    fetchStores();
  }, [fetchStores]);

  // Set up polling for real-time updates
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(() => {
      // Only fetch if not currently loading to avoid overlapping requests
      if (!loading) {
        fetchStores();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchStores, refreshInterval, loading]);

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
