import { useState, useEffect, useCallback } from 'react';
import { storeApi } from '../../services/api';
import type { Store } from '../types/store';

interface UseRealTimeStoresResult {
  stores: Store[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
  total?: number;
}

export const useRealTimeStores = (
  refreshInterval: number = 10000, // 10 seconds default for admin
  pagination?: { limit?: number; offset?: number }
): UseRealTimeStoresResult => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [total, setTotal] = useState<number | undefined>(undefined);

  // Extract pagination values for dependency comparison
  const limit = pagination?.limit;
  const offset = pagination?.offset;

  const fetchStores = useCallback(async () => {
    try {
      setError(null);
      
      // Use the current pagination values (extracted from dependencies)
      const paginationParams = (limit !== undefined || offset !== undefined) 
        ? { limit, offset } 
        : undefined;
      const response = await storeApi.getAllStores(paginationParams);
      
      if (response.success) {
        setStores(response.data || []);
        setLastUpdated(new Date());
        if ((response as any).total !== undefined) {
          setTotal((response as any).total);
        }
      } else {
        setError('Failed to fetch stores');
      }
    } catch (err) {
      console.error('Error fetching stores:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stores');
    } finally {
      setLoading(false);
    }
  }, [limit, offset]); // Only depend on limit and offset values, not the object

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
    lastUpdated,
    total
  };
};
