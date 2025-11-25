'use client';

import { useState, useEffect } from 'react';
import { useFavorites } from '@/contexts/FavoritesContext';
import { apiService, Store } from '@/services/api';
import Header from '@/components/common/Header';
import StoreCard from '../stores/components/StoreCard';

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
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Favorites</h1>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading favorite stores...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        ) : stores.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">❤️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No favorite stores yet</h3>
            <p className="text-gray-600 mb-6">
              Start exploring stores and add them to your favorites!
            </p>
            <a
              href="/"
              className="inline-block bg-orange-500 text-white px-6 py-2 rounded-md hover:bg-orange-600 transition-colors"
            >
              Browse Stores
            </a>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-6">
              You have {stores.length} favorite store{stores.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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

