'use client';

import { Store } from '@/services/api';
import { useFavorites } from '@/contexts/FavoritesContext';

interface StoreCardProps {
  store: Store;
  onClick?: (store: Store) => void;
}

export default function StoreCard({ store, onClick }: StoreCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(store.id);

  const handleClick = () => {
    if (onClick) {
      onClick(store);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    toggleFavorite(store.id);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={i} className="text-yellow-400">★</span>);
    }

    if (hasHalfStar) {
      stars.push(<span key="half" className="text-yellow-400">☆</span>);
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<span key={`empty-${i}`} className="text-gray-300">☆</span>);
    }

    return stars;
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200 hover:border-orange-500 relative overflow-hidden group"
      onClick={handleClick}
    >
      {store.featured && (
        <div className="absolute top-2 left-2 bg-gradient-to-r from-red-500 to-pink-500 text-white px-2 py-1 rounded text-xs font-bold z-10">
          Featured
        </div>
      )}
      {store.discount && (
        <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold z-10">
          {store.discount}
        </div>
      )}
      <button
        onClick={handleFavoriteClick}
        className={`absolute top-2 right-2 p-2 rounded-full z-10 transition-colors ${
          favorite
            ? 'bg-red-500 text-white'
            : 'bg-white bg-opacity-80 text-gray-600 hover:bg-opacity-100'
        }`}
        title={favorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        {favorite ? '❤️' : '🤍'}
      </button>
      
      <div className="relative h-48 overflow-hidden">
        <img 
          src={store.imageUrl} 
          alt={store.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 truncate flex-1">{store.name}</h3>
          {store.isVerified && (
            <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs ml-2">
              ✓
            </span>
          )}
        </div>
        
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{store.description}</p>
        
        <div className="flex items-center mb-3">
          <div className="flex items-center mr-2">
            {renderStars(store.rating)}
          </div>
          <span className="text-sm text-gray-600">
            {store.rating} ({store.reviewCount} reviews)
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500 text-xs">Category:</span>
            <p className="font-medium text-gray-900">{store.category}</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Location:</span>
            <p className="font-medium text-gray-900">{store.location}</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Products:</span>
            <p className="font-medium text-gray-900">{store.productsCount.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Established:</span>
            <p className="font-medium text-gray-900">{store.establishedYear}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
