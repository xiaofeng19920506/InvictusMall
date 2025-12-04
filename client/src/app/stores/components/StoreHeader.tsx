"use client";

import { useEffect, useState } from "react";
import { Store } from "@/services/api";
import { getImageUrl, getPlaceholderImage, handleImageError } from "@/utils/imageUtils";
import StarRating from "./StarRating";
import { productService, Product } from "@/services/product";
import styles from "./StoreHeader.module.scss";

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
                    ✓ Verified
                  </span>
                )}
              </div>
              <div className={styles.metaRow}>
                <div className={styles.ratingGroup}>
                  <StarRating rating={store.rating} size="text-sm" />
                  <span>{store.rating.toFixed(1)}</span>
                </div>
                <span>({store.reviewCount} reviews)</span>
                <span>📍 {store.location}</span>
              </div>
            </div>
          </div>

          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Categories:</span>
              <span className={styles.statValue}>
                {store.category.join(', ')}
              </span>
            </div>
            {!isLoadingCounts && (
              <>
                {productsCount !== undefined && productsCount > 0 && (
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Products:</span>
                    <span className={styles.statValue}>{productsCount}</span>
                  </div>
                )}
                {productsCount !== undefined && productsCount === 0 && servicesCount !== undefined && servicesCount > 0 && (
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Services:</span>
                    <span className={styles.statValue}>{servicesCount}</span>
                  </div>
                )}
              </>
            )}
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Established:</span>
              <span className={styles.statValue}>{store.establishedYear}</span>
            </div>
            {store.discount && (
              <div className={styles.statItem}>
                <span className={styles.discountBadge}>
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

