"use client";

import { useEffect, useState } from "react";
import { Store } from "@/services/api";
<<<<<<< HEAD
import { getImageUrl } from "@/utils/imageUtils";
import StarRating from "./StarRating";
import { productService, Product } from "@/services/product";
=======
import { getImageUrl, getPlaceholderImage, handleImageError } from "@/utils/imageUtils";
import StarRating from "./StarRating";
import { productService, Product } from "@/services/product";
import styles from "./StoreHeader.module.scss";
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009

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
<<<<<<< HEAD
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
=======
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.imageWrapper}>
          <img
            src={getImageUrl(store.imageUrl) || getPlaceholderImage()}
            alt={store.name}
            className={styles.storeImage}
            onError={handleImageError}
          />
        </div>

        <div className={styles.info}>
          <div className={styles.headerRow}>
            <div>
              <div className={styles.titleRow}>
                <h1 className={styles.title}>
                  {store.name}
                </h1>
                {store.isVerified && (
                  <span className={styles.verifiedBadge}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                    ✓ Verified
                  </span>
                )}
              </div>
<<<<<<< HEAD
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
=======
              <div className={styles.metaRow}>
                <div className={styles.ratingGroup}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                  <StarRating rating={store.rating} size="text-sm" />
                  <span>{store.rating.toFixed(1)}</span>
                </div>
                <span>({store.reviewCount} reviews)</span>
                <span>📍 {store.location}</span>
              </div>
            </div>
          </div>

<<<<<<< HEAD
          <p className="text-gray-700 mb-4">{store.description}</p>

          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-500">Category:</span>
              <span className="ml-2 font-medium">{store.category}</span>
=======
          <p className={styles.description}>{store.description}</p>

          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Category:</span>
              <span className={styles.statValue}>{store.category}</span>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
            </div>
            {!isLoadingCounts && (
              <>
                {productsCount !== undefined && productsCount > 0 && (
<<<<<<< HEAD
                  <div>
                    <span className="text-gray-500">Products:</span>
                    <span className="ml-2 font-medium">{productsCount}</span>
                  </div>
                )}
                {productsCount !== undefined && productsCount === 0 && servicesCount !== undefined && servicesCount > 0 && (
                  <div>
                    <span className="text-gray-500">Services:</span>
                    <span className="ml-2 font-medium">{servicesCount}</span>
=======
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Products:</span>
                    <span className={styles.statValue}>{productsCount}</span>
                  </div>
                )}
                {productsCount !== undefined && productsCount === 0 && servicesCount !== undefined && servicesCount > 0 && (
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Services:</span>
                    <span className={styles.statValue}>{servicesCount}</span>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                  </div>
                )}
              </>
            )}
<<<<<<< HEAD
            <div>
              <span className="text-gray-500">Established:</span>
              <span className="ml-2 font-medium">{store.establishedYear}</span>
            </div>
            {store.discount && (
              <div>
                <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium">
=======
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Established:</span>
              <span className={styles.statValue}>{store.establishedYear}</span>
            </div>
            {store.discount && (
              <div className={styles.statItem}>
                <span className={styles.discountBadge}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
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

