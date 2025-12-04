"use client";

<<<<<<< HEAD
import { useState, useEffect, useRef } from "react";
=======
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
import { useParams, useRouter } from "next/navigation";
import { apiService, Store } from "@/services/api";
import { productService, Product } from "@/services/product";
import { useCart } from "@/contexts/CartContext";
import Header from "@/components/common/Header";
import Link from "next/link";
<<<<<<< HEAD
import { getImageUrl } from "@/utils/imageUtils";
import ReservationModal from "./ReservationModal";

function StarRating({ rating, size = "text-lg" }: { rating: number; size?: string }) {
  // If no rating or rating is 0, show all empty stars
  if (!rating || rating === 0) {
    return (
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <span key={i} className={`${size} text-gray-300`}>
=======
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
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
            ☆
          </span>
        ))}
      </div>
    );
  }

  return (
<<<<<<< HEAD
    <div className="flex">
=======
    <div className={starRatingStyles.container}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
      {[...Array(5)].map((_, i) => {
        const starValue = i + 1;
        const filled = rating >= starValue;
        const halfFilled = rating >= starValue - 0.5 && rating < starValue;
        
        return (
          <span
            key={i}
<<<<<<< HEAD
            className={`${size} ${
              filled || halfFilled ? "text-yellow-400" : "text-gray-300"
            }`}
=======
            className={`${starRatingStyles.star} ${
              filled || halfFilled ? starRatingStyles.filled : starRatingStyles.empty
            } ${starRatingStyles[size]}`}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
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

<<<<<<< HEAD
  // Separate products and services
  const products = allItems.filter(item => item.category === "product" || !item.category);
  const services = allItems.filter(item => item.category === "service");
=======
  // Memoize filtered products and services to avoid recalculation
  const products = useMemo(
    () => allItems.filter(item => item.category === "product" || !item.category),
    [allItems]
  );
  const services = useMemo(
    () => allItems.filter(item => item.category === "service"),
    [allItems]
  );
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009

  useEffect(() => {
    if (storeId && !initialStore) {
      fetchStoreDetails();
    } else {
      setLoading(false);
<<<<<<< HEAD
    }
    if (storeId) {
      fetchProducts();
    }
  }, [storeId]);
=======
    }
    if (storeId) {
      fetchProducts();
    }
  }, [storeId, initialStore, fetchStoreDetails, fetchProducts]);
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009

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

<<<<<<< HEAD
  const fetchStoreDetails = async () => {
=======
  const fetchStoreDetails = useCallback(async () => {
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
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
  }, [storeId]);

<<<<<<< HEAD
  const fetchProducts = async () => {
=======
  const fetchProducts = useCallback(async () => {
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
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
<<<<<<< HEAD
  };
=======
  }, [storeId]);
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009

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

<<<<<<< HEAD
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Store Header */}
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
                    // Prevent infinite onError loop by removing the handler
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
                {!productsLoading && (
                  <>
                    {products.length > 0 && (
                      <div>
                        <span className="text-gray-500">Products:</span>
                        <span className="ml-2 font-medium">{products.length}</span>
                      </div>
                    )}
                    {products.length === 0 && services.length > 0 && (
                      <div>
                        <span className="text-gray-500">Services:</span>
                        <span className="ml-2 font-medium">{services.length}</span>
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
=======
      <div className={styles.container}>
        {/* Store Header - Using StoreHeader component */}
        <StoreHeader store={store} storeId={storeId} />
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009

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

<<<<<<< HEAD
          <div className="p-6">
=======
          <div className={styles.tabContent}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
            {/* Products Tab */}
            {activeTab === "products" && (
              <div>
                {productsLoading ? (
<<<<<<< HEAD
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {products.map((product) => (
                        <div
                          key={product.id}
                          className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                        >
                          {product.imageUrl && (
                            <img
                              src={getImageUrl(product.imageUrl) || "/placeholder/product.png"}
                              alt={product.name}
                              className="w-full h-48 object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                // Prevent infinite onError loop by removing the handler
                                target.onerror = null;
                                target.src = "/placeholder/product.png";
                              }}
                            />
                          )}
                          {!product.imageUrl && (
                            <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-400">No Image</span>
                            </div>
                          )}
                          <div className="p-4">
                            <h4 className="font-semibold text-gray-900 mb-1">
                              {product.name}
                            </h4>
                            {product.description && (
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                {product.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xl font-bold text-orange-500">
                                ${product.price.toFixed(2)}
                              </span>
                              <span className="text-sm text-gray-500">
=======
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
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                                Stock: {product.stockQuantity}
                              </span>
                            </div>
                            <AddToCartButton product={product} store={store} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {products.length === 0 && !productsLoading && (
<<<<<<< HEAD
                      <div className="text-center py-12">
                        <p className="text-gray-600">No products available yet.</p>
=======
                      <div className={styles.emptyState}>
                        <p>No products available yet.</p>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
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
<<<<<<< HEAD
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {services.map((service) => (
                        <div
                          key={service.id}
                          className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                        >
                          {service.imageUrl && (
                            <img
                              src={getImageUrl(service.imageUrl) || "/placeholder/service.png"}
                              alt={service.name}
                              className="w-full h-48 object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                // Prevent infinite onError loop by removing the handler
                                target.onerror = null;
                                target.src = "/placeholder/service.png";
                              }}
                            />
                          )}
                          {!service.imageUrl && (
                            <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-400">No Image</span>
                            </div>
                          )}
                          <div className="p-4">
                            <h4 className="font-semibold text-gray-900 mb-1">
                              {service.name}
                            </h4>
                            {service.description && (
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                {service.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xl font-bold text-orange-500">
=======
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
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                                ${service.price.toFixed(2)}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedService(service);
                                setIsReservationModalOpen(true);
                              }}
<<<<<<< HEAD
                              className="w-full py-2 rounded-md bg-orange-500 text-white hover:bg-orange-600 transition-colors cursor-pointer"
=======
                              className={styles.reservationButton}
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                            >
                              Make Reservation
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {services.length === 0 && !productsLoading && (
<<<<<<< HEAD
                      <div className="text-center py-12">
                        <p className="text-gray-600">No services available yet.</p>
=======
                      <div className={styles.emptyState}>
                        <p>No services available yet.</p>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
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

