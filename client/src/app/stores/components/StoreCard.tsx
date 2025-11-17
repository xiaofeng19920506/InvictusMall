"use client";

import { Store } from "@/services/api";
import { getImageUrl } from "@/utils/imageUtils";

interface StoreCardProps {
  store: Store;
  onClick?: (store: Store) => void;
}

export default function StoreCard({ store, onClick }: StoreCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(store);
    }
  };

  return (
    <div
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200 hover:border-orange-500 relative overflow-hidden group"
      onClick={handleClick}
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={getImageUrl(store.imageUrl)}
          alt={store.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {store.name}
        </h3>

        <p className="text-gray-600 text-sm line-clamp-2">
          {store.description}
        </p>
      </div>
    </div>
  );
}
