"use client";

import { useEffect, useState } from "react";
import { Store } from "@/services/api";
import { getImageUrl } from "@/utils/imageUtils";
import StarRating from "./StarRating";
import { productService, Product } from "@/services/product";

interface StoreHeaderProps {
  store: Store;
  storeId: string;
}

export default function StoreHeader({ store, storeId }: StoreHeaderProps) {
  const [productsCount, setProductsCount] = useState<number | undefined>(undefined);
  const [servicesCount, setServicesCount] = useState<number | undefined>(undefined);
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        setIsLoadingCounts(true);
        const response = await productService.getProductsByStoreId(storeId, { isActive: true });
        if (response.success) {
          const allItems = response.data || [];
          const products = allItems.filter(item => item.category === "product" || !item.category);
          const services = allItems.filter(item => item.category === "service");
          setProductsCount(products.length);
          setServicesCount(services.length);
        }
      } catch (err) {
        console.error("Error fetching product counts:", err);
      } finally {
        setIsLoadingCounts(false);
      }
    };

    if (storeId) {
      fetchCounts();
    }
  }, [storeId]);
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-shrink-0">
          {store.imageUrl ? (
            <img
              src={getImageUrl(store.imageUrl) || "/placeholder/store.png"}
              alt={store.name}
              className="w-full md:w-64 h-64 object-cover rounded-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = "/placeholder/store.png";
              }}
            />
          ) : (
            <div className="w-full md:w-64 h-64 bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-gray-400">No Image</span>
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {store.name}
                </h1>
                {store.isVerified && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                    ✓ Verified
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <StarRating rating={store.rating} size="text-sm" />
                  <span>{store.rating.toFixed(1)}</span>
                </div>
                <span>({store.reviewCount} reviews)</span>
                <span>📍 {store.location}</span>
              </div>
            </div>
          </div>

          <p className="text-gray-700 mb-4">{store.description}</p>

          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-500">Category:</span>
              <span className="ml-2 font-medium">{store.category}</span>
            </div>
            {!isLoadingCounts && (
              <>
                {productsCount !== undefined && productsCount > 0 && (
                  <div>
                    <span className="text-gray-500">Products:</span>
                    <span className="ml-2 font-medium">{productsCount}</span>
                  </div>
                )}
                {productsCount !== undefined && productsCount === 0 && servicesCount !== undefined && servicesCount > 0 && (
                  <div>
                    <span className="text-gray-500">Services:</span>
                    <span className="ml-2 font-medium">{servicesCount}</span>
                  </div>
                )}
              </>
            )}
            <div>
              <span className="text-gray-500">Established:</span>
              <span className="ml-2 font-medium">{store.establishedYear}</span>
            </div>
            {store.discount && (
              <div>
                <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium">
                  {store.discount}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

