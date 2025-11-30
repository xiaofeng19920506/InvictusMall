import { Store } from "@/services/api";
import { getImageUrl, getPlaceholderImage, handleImageError } from "@/utils/imageUtils";
import Link from "next/link";

interface StoreCardProps {
  store: Store;
}

export default function StoreCard({ store }: StoreCardProps) {
  return (
    <Link
      href={`/stores/${store.id}`}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200 hover:border-orange-500 relative overflow-hidden group block"
    >
      <div className="relative h-48 overflow-hidden bg-gray-200">
        <img
          src={getImageUrl(store.imageUrl) || getPlaceholderImage()}
          alt={store.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={handleImageError}
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
    </Link>
  );
}
