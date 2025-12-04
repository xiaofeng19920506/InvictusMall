"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Store } from "@/services/api";
import { productService, Product } from "@/services/product";
import { useCart } from "@/contexts/CartContext";
import { getImageUrl, getPlaceholderImage, handleImageError } from "@/utils/imageUtils";
import ReservationModal from "./ReservationModal";
import styles from "./StoreTabsContent.module.scss";

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
    "products" | "services" | "reviews"
  >("products");
  const [selectedService, setSelectedService] = useState<Product | null>(null);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const initialTabSet = useRef(false);

  // Separate products and services
  const products = allItems.filter(item => item.category === "product" || !item.category);
  const services = allItems.filter(item => item.category === "service");

  useEffect(() => {
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

  return (
    <>
      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabsHeader}>
          <nav className={styles.tabsNav} aria-label="Tabs">
            {[
              ...(products.length > 0 ? [{ id: "products", label: `Products (${products.length})` }] : []),
              ...(services.length > 0 ? [{ id: "services", label: `Services (${services.length})` }] : []),
              { id: "reviews", label: `Reviews (${store.reviewCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
<<<<<<< HEAD
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

          {/* Reviews Tab */}
          {activeTab === "reviews" && (
            <div className={styles.reviewsContainer}>
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>Review system coming soon...</p>
                <p className={styles.emptyTextSmall}>
                  Reviews feature will be implemented in the next update.
                </p>
              </div>
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

