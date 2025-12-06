"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Store } from "@/services/api";
import { productService, Product } from "@/services/product";
import { useCart } from "@/contexts/CartContext";
import { getImageUrl, getPlaceholderImage, handleImageError } from "@/utils/imageUtils";
import ReservationModal from "./ReservationModal";
import styles from "./StoreTabsContent.module.scss";

import starRatingStyles from "./StarRating.module.scss";

function StarRating({ rating, size = "lg" }: { rating: number; size?: "sm" | "base" | "lg" | "xl" }) {
  if (!rating || rating === 0) {
    return (
      <div className={starRatingStyles.container}>
        {[...Array(5)].map((_, i) => (
          <span key={i} className={`${starRatingStyles.star} ${starRatingStyles.empty} ${starRatingStyles[size]}`}>
            ☆
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={starRatingStyles.container}>
      {[...Array(5)].map((_, i) => {
        const starValue = i + 1;
        const filled = rating >= starValue;
        const halfFilled = rating >= starValue - 0.5 && rating < starValue;
        
        return (
          <span
            key={i}
            className={`${starRatingStyles.star} ${
              filled || halfFilled ? starRatingStyles.filled : starRatingStyles.empty
            } ${starRatingStyles[size]}`}
          >
            {filled ? "⭐" : halfFilled ? "⭐" : "☆"}
          </span>
        );
      })}
    </div>
  );
}

function AddToCartButton({
  product,
  store,
}: {
  product: Product;
  store: Store;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({
      productId: product.id,
      productName: product.name,
      productImage: (product.imageUrls && product.imageUrls.length > 0) 
        ? product.imageUrls[0] 
        : product.imageUrl,
      price: product.price,
      quantity: 1,
      storeId: store.id,
      storeName: store.name,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <button
      onClick={handleAddToCart}
      className={`${styles.addToCartButton} ${
        added ? styles.added : styles.normal
      }`}
    >
      {added ? "✓ Added to Cart" : "Add to Cart"}
    </button>
  );
}

interface StoreTabsContentProps {
  store: Store;
}

export default function StoreTabsContent({ store }: StoreTabsContentProps) {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;

  const [allItems, setAllItems] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "products" | "services"
  >("products");
  const [selectedService, setSelectedService] = useState<Product | null>(null);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const initialTabSet = useRef(false);

  // Separate products and services
  const products = useMemo(
    () => allItems.filter(item => item.category === "product" || !item.category),
    [allItems]
  );
  const services = useMemo(
    () => allItems.filter(item => item.category === "service"),
    [allItems]
  );

  const fetchProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      const response = await productService.getProductsByStoreId(storeId, { isActive: true });
      if (response.success) {
        setAllItems(response.data || []);
      } else {
        setAllItems([]);
      }
    } catch (err: any) {
      setAllItems([]);
    } finally {
      setProductsLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    if (storeId) {
      fetchProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]); // Only depend on storeId, fetchProducts is stable due to useCallback


  // Set initial tab and handle tab switching when content is unavailable
  useEffect(() => {
    if (!productsLoading) {
      // Set initial tab once based on what's available
      if (!initialTabSet.current) {
        if (products.length > 0) {
          setActiveTab("products");
        } else if (services.length > 0) {
          setActiveTab("services");
        }
        initialTabSet.current = true;
      } else {
        // If current tab has no content, switch to an available tab
        if (activeTab === "products" && products.length === 0) {
          // Switch to services if available
          if (services.length > 0) {
            setActiveTab("services");
          }
        } else if (activeTab === "services" && services.length === 0) {
          // Switch to products if available
          if (products.length > 0) {
            setActiveTab("products");
          }
        }
      }
    }
  }, [products.length, services.length, productsLoading, activeTab]);


  return (
    <>
      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabsHeader}>
          <nav className={styles.tabsNav} aria-label="Tabs">
            {[
              ...(products.length > 0 ? [{ id: "products", label: `Products (${products.length})` }] : []),
              ...(services.length > 0 ? [{ id: "services", label: `Services (${services.length})` }] : []),
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${styles.tabButton} ${
                  activeTab === tab.id ? styles.active : styles.inactive
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className={styles.tabsContent}>
          {/* Products Tab */}
          {activeTab === "products" && (
            <div>
              {productsLoading ? (
                <div className={styles.loadingContainer}>
                  <div className={styles.spinner}></div>
                </div>
              ) : (
                <>
                  <div className={styles.productsGrid}>
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className={styles.productCard}
                        onClick={() => router.push(`/products/${product.id}`)}
                      >
                        {((product.imageUrls && product.imageUrls.length > 0) || product.imageUrl) ? (
                          <img
                            src={getImageUrl(
                              product.imageUrls && product.imageUrls.length > 0
                                ? product.imageUrls[0]
                                : product.imageUrl
                            ) || getPlaceholderImage()}
                            alt={product.name}
                            className={styles.productImage}
                            onError={handleImageError}
                          />
                        ) : (
                          <div className={styles.productImagePlaceholder}>
                            <span>No Image</span>
                          </div>
                        )}
                        <div className={styles.productContent}>
                          <h4 className={styles.productName}>
                            {product.name}
                          </h4>
                          {product.description && (
                            <p className={styles.productDescription}>
                              {product.description}
                            </p>
                          )}
                          <div className={styles.productFooter}>
                            <span className={styles.productPrice}>
                              ${product.price.toFixed(2)}
                            </span>
                            <span className={styles.productStock}>
                              Stock: {product.stockQuantity}
                            </span>
                          </div>
                          <AddToCartButton product={product} store={store} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {products.length === 0 && !productsLoading && (
                    <div className={styles.emptyState}>
                      <p className={styles.emptyText}>No products available yet.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Services Tab */}
          {activeTab === "services" && (
            <div>
              {productsLoading ? (
                <div className={styles.loadingContainer}>
                  <div className={styles.spinner}></div>
                </div>
              ) : (
                <>
                  <div className={styles.productsGrid}>
                    {services.map((service) => (
                      <div
                        key={service.id}
                        className={styles.serviceCard}
                      >
                        {((service.imageUrls && service.imageUrls.length > 0) || service.imageUrl) ? (
                          <img
                            src={getImageUrl(
                              service.imageUrls && service.imageUrls.length > 0
                                ? service.imageUrls[0]
                                : service.imageUrl
                            ) || getPlaceholderImage()}
                            alt={service.name}
                            className={styles.productImage}
                            onError={handleImageError}
                          />
                        ) : (
                          <div className={styles.productImagePlaceholder}>
                            <span>No Image</span>
                          </div>
                        )}
                        <div className={styles.productContent}>
                          <h4 className={styles.productName}>
                            {service.name}
                          </h4>
                          {service.description && (
                            <p className={styles.productDescription}>
                              {service.description}
                            </p>
                          )}
                          <div className={styles.productFooter}>
                            <span className={styles.productPrice}>
                              ${service.price.toFixed(2)}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedService(service);
                              setIsReservationModalOpen(true);
                            }}
                            className={styles.reservationButton}
                          >
                            Make Reservation
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {services.length === 0 && !productsLoading && (
                    <div className={styles.emptyState}>
                      <p className={styles.emptyText}>No services available yet.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Reservation Modal */}
      {selectedService && store && (
        <ReservationModal
          service={selectedService}
          store={store}
          isOpen={isReservationModalOpen}
          onClose={() => {
            setIsReservationModalOpen(false);
            setSelectedService(null);
          }}
        />
      )}
    </>
  );
}

