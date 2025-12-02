"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiService, Store } from "@/services/api";
import { productService, Product } from "@/services/product";
import { useCart } from "@/contexts/CartContext";
import Header from "@/components/common/Header";
import Link from "next/link";
import { getImageUrl, getPlaceholderImage, handleImageError } from "@/utils/imageUtils";
import ReservationModal from "./ReservationModal";
import StoreHeader from "./StoreHeader";
import styles from "./StoreDetailContent.module.scss";

import starRatingStyles from "./StarRating.module.scss";

function StarRating({ rating, size = "lg" }: { rating: number; size?: "sm" | "base" | "lg" | "xl" }) {
  // If no rating or rating is 0, show all empty stars
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
      className={`w-full py-2 rounded-md transition-colors cursor-pointer ${
        added
          ? "bg-green-500 text-white"
          : "bg-orange-500 text-white hover:bg-orange-600"
      }`}
    >
      {added ? "✓ Added to Cart" : "Add to Cart"}
    </button>
  );
}

interface StoreDetailContentProps {
  initialStore: Store | null;
}

export default function StoreDetailContent({ initialStore }: StoreDetailContentProps) {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;

  const [store, setStore] = useState<Store | null>(initialStore);
  const [allItems, setAllItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(!initialStore);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<
    "products" | "services" | "reviews"
  >("products");
  const [selectedService, setSelectedService] = useState<Product | null>(null);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const initialTabSet = useRef(false);

  // Separate products and services
  const products = allItems.filter(item => item.category === "product" || !item.category);
  const services = allItems.filter(item => item.category === "service");

  useEffect(() => {
    if (storeId && !initialStore) {
      fetchStoreDetails();
    } else {
      setLoading(false);
    }
    if (storeId) {
      fetchProducts();
    }
  }, [storeId]);

  // Set initial tab and handle tab switching when content is unavailable
  useEffect(() => {
    if (!productsLoading) {
      // Set initial tab once based on what's available
      if (!initialTabSet.current) {
        if (products.length > 0) {
          setActiveTab("products");
        } else if (services.length > 0) {
          setActiveTab("services");
        } else {
          setActiveTab("reviews");
        }
        initialTabSet.current = true;
      } else {
        // If current tab has no content, switch to an available tab
        if (activeTab === "products" && products.length === 0) {
          // Switch to services if available, otherwise reviews
          setActiveTab(services.length > 0 ? "services" : "reviews");
        } else if (activeTab === "services" && services.length === 0) {
          // Switch to products if available, otherwise reviews
          setActiveTab(products.length > 0 ? "products" : "reviews");
        }
      }
    }
  }, [products.length, services.length, productsLoading, activeTab]);

  const fetchStoreDetails = async () => {
    try {
      const response = await apiService.getStoreById(storeId);
      if (response.success) {
        setStore(response.data);
      } else {
        setError("Store not found");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load store details");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const response = await productService.getProductsByStoreId(storeId, { isActive: true });
      if (response.success) {
        setAllItems(response.data || []);
      } else {
        console.error("Failed to fetch products:", response.message);
        setAllItems([]);
      }
    } catch (err: any) {
      console.error("Error fetching products:", err);
      setAllItems([]);
    } finally {
      setProductsLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
        </div>
      </>
    );
  }

  if (error || !store) {
    return (
      <>
        <Header />
        <div className={styles.errorContainer}>
          <div className={styles.errorContent}>
            <h2 className={styles.errorTitle}>
              Store Not Found
            </h2>
            <p className={styles.errorMessage}>
              {error || "The store you are looking for does not exist."}
            </p>
            <Link
              href="/"
              className={styles.backButton}
            >
              Back to Stores
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />

      <div className={styles.container}>
        {/* Store Header - Using StoreHeader component */}
        <StoreHeader store={store} storeId={storeId} />

        {/* Tabs */}
        <div className={styles.tabsCard}>
          <div className={styles.tabsNav}>
            <nav className={styles.tabsList} aria-label="Tabs">
              {[
                ...(products.length > 0 ? [{ id: "products", label: `Products (${products.length})` }] : []),
                ...(services.length > 0 ? [{ id: "services", label: `Services (${services.length})` }] : []),
                { id: "reviews", label: `Reviews (${store.reviewCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className={styles.tabContent}>
            {/* Products Tab */}
            {activeTab === "products" && (
              <div>
                {productsLoading ? (
                  <div className={styles.loadingSpinner}>
                    <div className={styles.smallSpinner}></div>
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
                          {(product.imageUrls && product.imageUrls.length > 0) || product.imageUrl ? (
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
                        <p>No products available yet.</p>
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
                  <div className={styles.loadingSpinner}>
                    <div className={styles.smallSpinner}></div>
                  </div>
                ) : (
                  <>
                    <div className={styles.productsGrid}>
                      {services.map((service) => (
                        <div
                          key={service.id}
                          className={styles.productCard}
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
                        <p>No services available yet.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === "reviews" && (
              <div className={styles.reviewsSection}>
                <div className={styles.emptyState}>
                  <p>Review system coming soon...</p>
                  <p className={styles.emptySubtext}>
                    Reviews feature will be implemented in the next update.
                  </p>
                </div>
              </div>
            )}
          </div>
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

