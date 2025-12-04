"use client";

import { useState, useEffect, useRef } from "react";
<<<<<<< HEAD
import { useParams } from "next/navigation";
import { Store } from "@/services/api";
import { productService, Product } from "@/services/product";
import { useCart } from "@/contexts/CartContext";
import { getImageUrl } from "@/utils/imageUtils";
import ReservationModal from "./ReservationModal";
=======
import { useParams, useRouter } from "next/navigation";
import { Store } from "@/services/api";
import { productService, Product } from "@/services/product";
import { useCart } from "@/contexts/CartContext";
import { getImageUrl, getPlaceholderImage, handleImageError } from "@/utils/imageUtils";
import ReservationModal from "./ReservationModal";
import styles from "./StoreTabsContent.module.scss";
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009

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
<<<<<<< HEAD
      productImage: product.imageUrl,
=======
      productImage: (product.imageUrls && product.imageUrls.length > 0) 
        ? product.imageUrls[0] 
        : product.imageUrl,
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
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
<<<<<<< HEAD
      className={`w-full py-2 rounded-md transition-colors cursor-pointer ${
        added
          ? "bg-green-500 text-white"
          : "bg-orange-500 text-white hover:bg-orange-600"
=======
      className={`${styles.addToCartButton} ${
        added ? styles.added : styles.normal
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
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
<<<<<<< HEAD
=======
  const router = useRouter();
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
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
<<<<<<< HEAD
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
=======
      <div className={styles.tabsContainer}>
        <div className={styles.tabsHeader}>
          <nav className={styles.tabsNav} aria-label="Tabs">
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
            {[
              ...(products.length > 0 ? [{ id: "products", label: `Products (${products.length})` }] : []),
              ...(services.length > 0 ? [{ id: "services", label: `Services (${services.length})` }] : []),
              { id: "reviews", label: `Reviews (${store.reviewCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
<<<<<<< HEAD
                className={`py-4 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                  activeTab === tab.id
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
=======
                className={`${styles.tabButton} ${
                  activeTab === tab.id ? styles.active : styles.inactive
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

<<<<<<< HEAD
        <div className="p-6">
=======
        <div className={styles.tabsContent}>
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
<<<<<<< HEAD
                    <div className="text-center py-12">
                      <p className="text-gray-600">No products available yet.</p>
=======
                    <div className={styles.emptyState}>
                      <p className={styles.emptyText}>No products available yet.</p>
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
                      <p className={styles.emptyText}>No services available yet.</p>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === "reviews" && (
<<<<<<< HEAD
            <div className="space-y-4">
              <div className="text-center py-12">
                <p className="text-gray-600">Review system coming soon...</p>
                <p className="text-sm text-gray-500 mt-2">
=======
            <div className={styles.reviewsContainer}>
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>Review system coming soon...</p>
                <p className={styles.emptyTextSmall}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
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

