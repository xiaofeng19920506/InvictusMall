'use client';

import { useState, useEffect } from 'react';
import { useFavorites } from '@/contexts/FavoritesContext';
import { apiService, Store } from '@/services/api';
import Header from '@/components/common/Header';
import StoreCard from '../stores/components/StoreCard';
import styles from './page.module.scss';

// Note: This is a client component due to favorites context
// Metadata cannot be exported from client components
// Consider moving favorites fetching to server component wrapper

export default function FavoritesPage() {
  const { favorites, removeFavorite } = useFavorites();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (favorites.length > 0) {
      fetchFavoriteStores();
    } else {
      setLoading(false);
    }
  }, [favorites]);

  const fetchFavoriteStores = async () => {
    setLoading(true);
    setError('');
    try {
      const allStoresResponse = await apiService.getAllStores();
      if (allStoresResponse.success) {
        // Filter to only include favorite stores
        const favoriteStores = allStoresResponse.data.filter(store =>
          favorites.includes(store.id)
        );
        setStores(favoriteStores);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load favorite stores');
    } finally {
      setLoading(false);
    }
  };

  const handleStoreClick = (store: Store) => {
    window.location.href = `/stores/${store.id}`;
  };

  return (
    <div className={styles.pageContainer}>
      <Header />
      <div className={styles.container}>
        <h1 className={styles.title}>My Favorites</h1>

        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p className={styles.loadingText}>Loading favorite stores...</p>
          </div>
        ) : error ? (
          <div className={styles.errorMessage}>
            {error}
          </div>
        ) : stores.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>❤️</div>
            <h3 className={styles.emptyTitle}>No favorite stores yet</h3>
            <p className={styles.emptyMessage}>
              Start exploring stores and add them to your favorites!
            </p>
            <a
              href="/"
              className={styles.browseButton}
            >
              Browse Stores
            </a>
          </div>
        ) : (
          <>
            <p className={styles.countText}>
              You have {stores.length} favorite store{stores.length !== 1 ? 's' : ''}
            </p>
            <div className={styles.grid}>
              {stores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
